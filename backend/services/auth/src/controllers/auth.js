const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, asyncHandler } = require("@zuvo/shared");





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


const emailService = require("../services/email.service");

// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, username, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user
    const user = await User.create({
        name,
        email,
        username,
        password,
        verificationToken
    });

    // Send Verification Email
    try {
        await emailService.sendVerificationEmail(user.email, verificationToken);
        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email to verify your account."
        });
    } catch (err) {
        // If email fails, we might want to delete the user or allow them to retry verification later
        // For now, we'll just log and still return success with a warning
        res.status(201).json({
            success: true,
            message: "Registration successful, but verification email failed to send. Please contact support."
        });
    }
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

    // FIX B3: Check if email is verified — was returning success:true with 401 (inconsistency)
    if (!user.isVerified) {
        return res.status(403).json({
            success: false,
            message: "Account not verified. Please check your email to verify your account."
        });
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
        return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    // FIX B1: Verify JWT signature AND expiry BEFORE trusting DB lookup
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, message: "Refresh token is invalid or has expired" });
    }

    // Confirm the token exists in DB (validates it hasn't been revoked via logout)
    const user = await User.findOne({ _id: decoded._id, refreshToken }).select("+refreshToken");
    if (!user) {
        return res.status(401).json({ success: false, message: "Refresh token has been revoked" });
    }

    sendTokenResponse(user, 200, res);
});

// @route   GET /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ success: false, message: "Invalid verification token" });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // In a real app, redirect to a frontend "Success" page
    res.status(200).json({ success: true, message: "Email verified successfully. You can now login." });
});

// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // FIX B4: Use crypto.randomInt for cryptographically secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    try {
        await emailService.sendPasswordResetOTP(user.email, otp);
        res.status(200).json({ success: true, message: "OTP sent to your email" });
    } catch (err) {
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOTP: otp,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
});

/**
 * @desc    Google OAuth Success Handler
 * Extracted user from passport and issues Zuvo JWTs
 */
exports.googleAuthSuccess = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "OAuth Authentication Failed" });
    }

    // Issue Zuvo Tokens
    sendTokenResponse(req.user, 200, res);
});

// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});