const express = require("express");
const router = express.Router();
const {
    register,
    login,
    logout,
    refreshToken,
    getMe
} = require("../controllers/auth");
const { registerSchema, loginSchema } = require("../validations/auth");
const { authenticate, validator } = require("@zuvo/shared");

router.post("/register", validator(registerSchema), register);
router.post("/login", validator(loginSchema), login);

router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/me", authenticate, getMe);

module.exports = router;
