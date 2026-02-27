const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const tokenSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true, index: true },
    ip: String,
    userAgent: String,
    revoked: { type: Boolean, default: false },
    lastUsed: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: function () { return !this.googleId; }, // Required only if not using Google OAuth
        minlength: 6,
        select: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    hasSetUsername: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordHash: String,
    otpAttempts: {
        type: Number,
        default: 0
    },
    otpLockedUntil: Date,
    resetPasswordExpires: Date,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    bio: {
        type: String,
        maxlength: [200, "Bio cannot be more than 200 characters"]
    },
    avatar: {
        type: String,
        default: "default-avatar.jpg"
    },
    banner: {
        type: String,
        default: "default-banner.jpg"
    },
    location: String,
    website: String,
    refreshTokens: {
        type: [tokenSchema],
        select: false
    },
    followersCount: {
        type: Number,
        default: 0
    },
    followingCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, role: this.role },
        process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );
};

// Generate Refresh Token & Meta
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

// Hash any token using HMAC-SHA256
userSchema.methods.hashToken = function (token) {
    return crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(token)
        .digest("hex");
};

const User = mongoose.model("User", userSchema);
module.exports = User;
