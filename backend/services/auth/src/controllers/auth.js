const User = require("../models/user");
const { asyncHandler } = require("@zuvo/shared");





/**
 * @desc    Generate tokens and send in response
 */
const sendTokenResponse = async (user, statusCode, res) => {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token in database (optional but recommended for rotation/revocation)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    };

    res
        .status(statusCode)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
};

// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, username, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Create user
    const user = await User.create({
        name,
        email,
        username,
        password
    });

    sendTokenResponse(user, 201, res);
});

// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please provide an email and password" });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
});

// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    // Clear refresh token in DB
    if (req.cookies?.refreshToken) {
        const user = await User.findOne({ refreshToken: req.cookies.refreshToken });
        if (user) {
            user.refreshToken = undefined;
            await user.save({ validateBeforeSave: false });
        }
    }

    res.cookie("refreshToken", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    // Optional: Verify token with jwt.verify if you want to check expiry explicitly

    sendTokenResponse(user, 200, res);
});

// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});