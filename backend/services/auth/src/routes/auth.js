const express = require("express");
const router = express.Router();
const {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    verifyEmail,
    forgotPassword,
    resetPassword,
    googleAuthSuccess
} = require("../controllers/auth");
const passport = require("passport");
const { registerSchema, loginSchema } = require("../validations/auth");
const { authenticate, validator } = require("@zuvo/shared");

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: Registration successful, verification email sent
 */
router.post("/register", validator(registerSchema), register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user & get tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", validator(loginSchema), login);

/**
 * @openapi
 * /api/v1/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth flow
 */
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

/**
 * @openapi
 * /api/v1/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback endpoint
 */
router.get("/google/callback", passport.authenticate("google", { session: false }), googleAuthSuccess);

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email using token
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/verify-email", verifyEmail);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send password reset OTP
 */
router.post("/forgot-password", forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP
 */
router.post("/reset-password", resetPassword);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate tokens
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/v1/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post("/refresh-token", refreshToken);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get("/me", authenticate, getMe);

module.exports = router;
