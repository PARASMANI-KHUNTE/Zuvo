const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { asyncHandler, MessageBus, logger, models } = require("@zuvo/shared");
const User = models.User();

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
        const activeTokens = userWithTokens.refreshTokens.filter(t => !t.revoked);
        if (activeTokens.length >= 5) {
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
        secure: false, // Force false for local dev debugging
        sameSite: "lax", // Force lax for local dev debugging
        path: "/"
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
                role: user.role,
                avatar: user.avatar,
                hasSetUsername: user.hasSetUsername
            }
        });
};

// @route   GET /api/v1/auth/internal/users/search
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
            avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
        }))
    });
});

// @route   POST /api/v1/auth/register
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, username, password } = req.body;

    // SEAT LIMIT: Max 3 users
    // const userCount = await User.countDocuments();
    // if (userCount >= 3) {
    //     return res.status(403).json({ success: false, message: "User seat limit reached (Max 3). Contact administrator." });
    // }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await User.create({
        name,
        email,
        username,
        password,
        verificationToken
    });

    try {
        await MessageBus.publish("zuvo_tasks", {
            type: "EMAIL_SEND",
            emailType: "VERIFICATION",
            to: user.email,
            data: { token: verificationToken }
        });
        res.status(201).json({ success: true, message: "Registration successful. Verification email is being sent." });
    } catch (err) {
        logger.error(`Failed to publish verification email: ${err.message}`);
        res.status(201).json({ success: true, message: "Registration successful, but verification system is temporarily busy." });
    }
});

// @route   POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please provide an email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // if (process.env.NODE_ENV !== "development" && !user.isVerified) {
    //     return res.status(403).json({ success: false, message: "Account not verified. Please check your email.", unverified: true });
    // }

    await sendTokenResponse(user, 200, res, req);
});

// @route   POST /api/v1/auth/logout
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
        secure: false,
        sameSite: "lax",
        path: "/"
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// @route   POST /api/v1/auth/refresh-token
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    logger.info(`refreshToken: Attempting refresh. Cookie present: ${!!refreshToken}`);

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        logger.info(`refreshToken: JWT verified for user: ${decoded._id}`);
    } catch (err) {
        logger.warn(`refreshToken: JWT verification failed: ${err.message}`);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded._id).select("+refreshTokens");
    if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    const tokenHash = user.hashToken(refreshToken);
    const tokenRecord = user.refreshTokens.find(t => t.tokenHash === tokenHash);

    if (tokenRecord && tokenRecord.revoked) {
        const graceWindow = 15000; // 15s
        const timeSinceUsed = Date.now() - new Date(tokenRecord.lastUsed || tokenRecord.updatedAt || tokenRecord.createdAt).getTime();

        if (timeSinceUsed > graceWindow) {
            logger.warn(`REPLAY ATTACK for user ${user._id} (${timeSinceUsed}ms)`);
            user.refreshTokens.forEach(t => t.revoked = true);
            await user.save({ validateBeforeSave: false });

            res.cookie("refreshToken", "none", {
                expires: new Date(Date.now() + 10 * 1000),
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                path: "/"
            });
            return res.status(401).json({ success: false, message: "Security lockout triggered" });
        }
        logger.info(`Grace period refresh allowed for ${user._id}`);
    }

    if (!tokenRecord) {
        return res.status(401).json({ success: false, message: "Token not found" });
    }

    try {
        tokenRecord.revoked = true;
        tokenRecord.lastUsed = Date.now();
        await user.save({ validateBeforeSave: false });
    } catch (err) {
        if (err.name === 'VersionError') return res.status(409).json({ success: false, message: "Concurrent refresh" });
        throw err;
    }

    await sendTokenResponse(user, 200, res, req);
});

// @route   GET /api/v1/auth/verify-email
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: "Invalid token" });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, message: "Email verified" });
});

// @route   POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordHash = user.hashToken(otp);
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    try {
        await MessageBus.publish("zuvo_tasks", {
            type: "EMAIL_SEND",
            emailType: "OTP",
            to: user.email,
            data: { otp }
        });
        res.status(200).json({ success: true, message: "OTP sent" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Email failed" });
    }
});

// @route   POST /api/v1/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select("+resetPasswordHash");
    if (!user || user.resetPasswordExpires < Date.now()) return res.status(400).json({ success: false, message: "OTP expired" });

    if (user.resetPasswordHash !== user.hashToken(otp)) return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.password = newPassword;
    user.resetPasswordHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ success: true, message: "Reset successful" });
});

exports.googleAuthSuccess = asyncHandler(async (req, res, next) => {
    // Parse encoded state
    let stateObj = { platform: 'web' };
    if (req.query.state) {
        try {
            stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        } catch (e) {
            logger.error("googleAuthSuccess: Failed to parse state", e);
        }
    }

    if (!req.user) {
        logger.warn("googleAuthSuccess: No user found in request");
        const errorRedirect = stateObj.platform === 'mobile'
            ? (stateObj.redirect_uri || 'zuvomobile://auth/login') + (stateObj.redirect_uri?.includes('?') ? '&' : '?') + 'error=oauth_failed'
            : `${process.env.CORS_ORIGIN}/auth/login?error=oauth_failed`;
        return res.redirect(errorRedirect);
    }

    logger.info(`googleAuthSuccess: OAuth successful for user: ${req.user._id}`);

    try {
        const accessToken = req.user.generateAccessToken();
        const refreshToken = req.user.generateRefreshToken();
        const tokenHash = req.user.hashToken(refreshToken);

        const userWithTokens = await User.findById(req.user._id).select("+refreshTokens");
        if (!userWithTokens) {
            logger.warn(`googleAuthSuccess: User record not found for ID: ${req.user._id}`);
            return res.redirect(stateObj.platform === 'mobile' ? 'zuvomobile://auth/login?error=user_not_found' : `${process.env.CORS_ORIGIN}/auth/login?error=user_not_found`);
        }

        userWithTokens.refreshTokens.push({ tokenHash, ip: req.ip, userAgent: req.get("user-agent") || "unknown" });
        await userWithTokens.save({ validateBeforeSave: false });
        logger.info(`googleAuthSuccess: Tokens generated and saved for user: ${req.user._id}`);

        // For Web
        res.cookie("refreshToken", refreshToken, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/"
        });

        if (stateObj.platform === 'mobile') {
            const baseUri = stateObj.redirect_uri || 'zuvomobile://auth/callback';
            const redirectUrl = `${baseUri}${baseUri.includes('?') ? '&' : '?'}token=${accessToken}`;
            logger.info(`googleAuthSuccess: REDIRECTING MOBILE USER TO: ${redirectUrl}`);
            return res.redirect(redirectUrl);
        }

        logger.info(`googleAuthSuccess: Redirecting web user to CORS_ORIGIN callback`);
        res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?token=${accessToken}`);
    } catch (error) {
        logger.error(`googleAuthSuccess Error: ${error.message}`, error);
        const errorRedirect = stateObj.platform === 'mobile'
            ? (stateObj.redirect_uri || 'zuvomobile://auth/login') + (stateObj.redirect_uri?.includes('?') ? '&' : '?') + 'error=server_error'
            : `${process.env.CORS_ORIGIN}/auth/login?error=server_error`;
        res.redirect(errorRedirect);
    }
});

// @route   GET /api/v1/auth/me
exports.getMe = asyncHandler(async (req, res, next) => {
    logger.info(`getMe: ID: ${req.user?._id || req.user?.id}`);
    const user = await User.findById(req.user?._id || req.user?.id);
    res.status(200).json({ success: true, data: user });
});

// @route   PUT /api/v1/auth/profile
exports.updateProfile = asyncHandler(async (req, res, next) => {
    logger.info(`updateProfile: Attempting update for user: ${req.user.id || req.user._id}`);
    logger.info(`updateProfile: Body: ${JSON.stringify(req.body)}`);

    const user = await User.findByIdAndUpdate(req.user.id || req.user._id, req.body, {
        new: true,
        runValidators: true
    });

    if (!user) {
        logger.warn(`updateProfile: User not found: ${req.user.id || req.user._id}`);
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
});

// @route   GET /api/v1/auth/profile/:username
exports.getPublicProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
});

// @route   GET /api/v1/auth/internal/user/:id
exports.getInternalUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
});

// @route   GET /api/v1/auth/check-username/:username
exports.checkUsername = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    res.status(200).json({ success: true, available: !user });
});

// @route   POST /api/v1/auth/internal/users
exports.getInternalUsers = asyncHandler(async (req, res, next) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ success: false, message: "ids array is required" });
    }

    const users = await User.find({ _id: { $in: ids } }).select("name username avatar");
    res.status(200).json({ success: true, data: users });
});

// @route   GET /api/v1/auth/check-email/:email
exports.checkEmail = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    res.status(200).json({ success: true, available: !user });
});

// @route   PUT /api/v1/auth/change-password
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id || req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) return res.status(401).json({ success: false, message: 'Invalid current password' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed' });
});

/**
 * @desc    Delete user account (Soft Delete with GDPR event)
 * @route   DELETE /api/v1/auth/profile
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res, next) => {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // 1. Publish GDPR deletion event first
    try {
        await MessageBus.publish("zuvo_tasks", {
            type: "GDPR_USER_DELETE",
            userId: userId
        });
    } catch (err) {
        logger.error(`Failed to publish GDPR delete event for user ${userId}: ${err.message}`);
        return res.status(500).json({ success: false, message: "Failed to initiate account deletion. Please try again." });
    }

    // 2. Soft delete the user
    await user.softDelete();

    // 3. Clear tokens
    res.cookie("refreshToken", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/"
    });

    res.status(200).json({
        success: true,
        message: "Account marked for deletion. Data will be scrubbed within 30 days."
    });
});
