const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized to access this route" });
    }

    try {
        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
        console.log(`Auth Middleware: Verifying token with secret: ${secret ? secret.substring(0, 3) + "..." : "MISSING"} Path: ${req.path}`);
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message, "Path:", req.path, "Token Start:", token ? token.substring(0, 15) : "none");
        if (err.name === 'TokenExpiredError') {
            console.error("Auth Middleware: Token Expired at", err.expiredAt);
        }
        return res.status(401).json({ success: false, message: "Not authorized to access this route" });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
