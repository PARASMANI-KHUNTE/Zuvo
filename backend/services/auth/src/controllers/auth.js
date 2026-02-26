const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { asyncHandler, MessageBus, logger } = require("@zuvo/shared");
const User = require("../models/user");





/**
 * @desc    Generate tokens and send in response
 */
const sendTokenResponse = async (user, statusCode, res, req) => {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    const tokenHash = user.hashToken(refreshToken);

    // Hash and store refresh token with metadata
    const userWithTokens = await User.findById(user._id).select("+refreshTokens");

    // Prune sessions (Max 5)
    if (userWithTokens.refreshTokens.length >= 5) {
        // Find oldest non-revoked token
        const activeTokens = userWithTokens.refreshTokens.filter(t => !t.revoked);
        if (activeTokens.length >= 5) {
            // Mark oldest as revoked instead of deleting to maintain history logic
            activeTokens.sort((a, b) => a.createdAt - b.createdAt);
            activeTokens[0].revoked = true;
        }
    }

    userWithTokens.refreshTokens.push({
        tokenHash,
        ip: req.ip,
        userAgent: req.get("user-agent") || "unknown"
    });

    await userWithTokens.save({ validateBeforeSave: false });

    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
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

// @route   GET /api/v1/auth/internal/users/search
// @access  Internal (Service-to-Service)
exports.searchInternalUsers = asyncHandler(async (req, res, next) => {
    const { q, limit = 10, skip = 0 } = req.query;

    const query = q
        ? {
            $or: [
                { name: { $regex: q, $options: "i" } },
                { username: { $regex: q, $options: "i" } }
            ]
        }
        : {};

    const users = await User.find(query)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select("name username avatar");

    res.status(200).json({
        success: true,
        data: users.map(user => ({
            id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar || "default-avatar.jpg"
        }))
    });
});




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

    // Send Verification Email via Background Worker
    try {
        await MessageBus.publish("EMAIL_SEND", {
            type: "VERIFICATION",
            to: user.email,
            data: { token: verificationToken }
        });

        res.status(201).json({
            success: true,
            message: "Registration successful. Verification email is being sent."
        });
    } catch (err) {
        logger.error(`Failed to publish verification email: ${err.message}`);
        res.status(201).json({
            success: true,
            message: "Registration successful, but verification system is temporarily busy."
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

    // Skip verification check in development mode for easier testing
    if (process.env.NODE_ENV !== "development" && !user.isVerified) {
        return res.status(403).json({
            success: false,
            message: "Account not verified. Please check your email.",
            unverified: true
        });
    }

    await sendTokenResponse(user, 200, res, req);
});

// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        const user = await User.findById(req.user.id).select("+refreshTokens");
        if (user) {
            const tokenHash = user.hashToken(refreshToken);
            const tokenRecord = user.refreshTokens.find(t => t.tokenHash === tokenHash);
            if (tokenRecord) {
                tokenRecord.revoked = true;
                await user.save({ validateBeforeSave: false });
            }
        }
    }

    res.cookie("refreshToken", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// @route   POST /api/v1/auth/logout-all
// @access  Private
exports.logoutAllDevices = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+refreshTokens");
    // Mark ALL as revoked for audit trail
    user.refreshTokens.forEach(t => t.revoked = true);
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.status(200).json({ success: true, message: "Logged out from all devices" });
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
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Confirm the token exists in DB (validates it hasn't been revoked via logout)
    const user = await User.findById(decoded._id).select("+refreshTokens");
    if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    const tokenHash = user.hashToken(refreshToken);
    const tokenRecord = user.refreshTokens.find(t => t.tokenHash === tokenHash);

    // CRITICAL: Replay Detection
    if (tokenRecord && tokenRecord.revoked) {
        logger.warn(`REPLAY ATTACK DETECTED for user ${user._id}. Invalidating all sessions.`);
        user.refreshTokens.forEach(t => t.revoked = true);
        await user.save({ validateBeforeSave: false });

        res.cookie("refreshToken", "none", {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });
        return res.status(401).json({ success: false, message: "Security breach detected. All sessions invalidated." });
    }

    if (!tokenRecord) {
        return res.status(401).json({ success: false, message: "Token has been invalidated" });
    }

    // Role-based IP change detection (Loose match)
    const currentIp = req.ip;
    if (tokenRecord.ip && tokenRecord.ip !== currentIp) {
        logger.info(`Session IP change for user ${user._id}: ${tokenRecord.ip} -> ${currentIp}`);
        // We log it, but don't fail unless it's a high-value action
    }

    // Rotate: Revoke old, issue new
    try {
        tokenRecord.revoked = true;
        tokenRecord.lastUsed = Date.now();
        await user.save({ validateBeforeSave: false });
    } catch (err) {
        if (err.name === 'VersionError' || err.message.includes('No matching document')) {
            // Concurrent request already rotated this token (e.g., React Strict Mode double-request)
            return res.status(409).json({ success: false, message: "Concurrent token refresh detected" });
        }
        throw err;
    }

    await sendTokenResponse(user, 200, res, req);
});

// @route   GET /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ success: false, message: "Invalid token" });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // In a real app, redirect to a frontend "Success" page
    res.status(200).json({ success: true, message: "Email verified" });
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

    user.resetPasswordHash = user.hashToken(otp); // Use HMAC for OTP too
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpAttempts = 0;
    user.otpLockedUntil = undefined; // Reset any previous locks
    await user.save({ validateBeforeSave: false });

    try {
        await MessageBus.publish("EMAIL_SEND", {
            type: "OTP",
            to: user.email,
            data: { otp }
        });
        res.status(200).json({ success: true, message: "OTP sent to your email" });
    } catch (err) {
        logger.error(`OTP Publish failed: ${err.message}`);
        return res.status(500).json({ success: false, message: "Email system busy - " + err.message });
    }
});

// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select("+resetPasswordHash +otpAttempts +otpLockedUntil");

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
        return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Brute-force protection: Lockout Window
    if (user.otpLockedUntil && user.otpLockedUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
        return res.status(403).json({ success: false, message: `Account locked due to too many attempts. Try again in ${minutesLeft} minutes.` });
    }

    if (user.otpAttempts >= 5) {
        user.otpLockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
        await user.save({ validateBeforeSave: false });
        return res.status(403).json({ success: false, message: "Max attempts reached. Locked for 15 minutes." });
    }

    const otpHash = user.hashToken(otp);
    if (user.resetPasswordHash !== otpHash) {
        user.otpAttempts += 1;
        await user.save({ validateBeforeSave: false });
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordHash = undefined;
    user.resetPasswordExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockedUntil = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
});

/**
 * @desc    Google OAuth Success Handler
 * Extracted user from passport and issues Zuvo JWTs
 */
exports.googleAuthSuccess = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "OAuth Failed" });
    }

    // Issue Zuvo Tokens
    await sendTokenResponse(req.user, 200, res, req);
});

// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});

// @route   GET /api/v1/auth/internal/user/:id
// @access  Internal (Service-to-Service)
exports.getInternalUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
        success: true,
        data: {
            id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar || "default-avatar.jpg"
        }
    });
});

// @route   GET /api/v1/auth/check-username/:username
// @access  Public
exports.checkUsername = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    res.status(200).json({
        success: true,
        available: !user
    });
});

// @route   GET /api/v1/auth/check-email/:email
// @access  Public
exports.checkEmail = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    res.status(200).json({
        success: true,
        available: !user
    });
});