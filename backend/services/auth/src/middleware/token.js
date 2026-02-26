const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * @desc    Middleware to protect routes
 */
const authenticate = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
        // Optional: support token in cookies too
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized to access this route" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
        req.user = await User.findById(decoded._id);

        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Not authorized to access this route" });
    }
};

module.exports = { authenticate };
