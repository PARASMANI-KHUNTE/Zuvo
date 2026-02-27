const nodemailer = require("nodemailer");
const logger = require("./logger");
const { redisClient } = require("./redis");

/**
 * Enterprise Email Service
 * Handles transactional emails (Verifications, OTPs, Alerts)
 */
class EmailService {
    getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
        return this.transporter;
    }

    /**
     * Tracks daily recipient count to respect Gmail personal account limits (500/day)
     */
    async _checkAndUpdateQuota(recipientCount = 1) {
        if (!redisClient.isOpen) return true; // Fail open if Redis is down

        const today = new Date().toISOString().split('T')[0];
        const key = `email_quota:${today}:${process.env.SMTP_USER}`;
        const limit = 500;

        try {
            const currentCount = await redisClient.incrBy(key, recipientCount);
            if (currentCount === recipientCount) {
                // Set expiry for 24 hours on first increment
                await redisClient.expire(key, 86400);
            }

            if (currentCount > limit) {
                logger.error(`GMAIL QUOTA EXCEEDED: Sent ${currentCount} emails today (Limit: ${limit}). Email to be dropped.`);
                return false;
            }

            logger.info(`Email quota check: ${currentCount}/${limit} used today.`);
            return true;
        } catch (err) {
            logger.error("Email quota check failed", err);
            return true;
        }
    }

    /**
     * Send Verification Email
     */
    async sendVerificationEmail(to, token) {
        if (!(await this._checkAndUpdateQuota(1))) {
            throw new Error("Daily email quota exceeded (Gmail cap)");
        }

        const url = `${process.env.GATEWAY_URL || 'http://localhost:5000'}/api/v1/auth/verify-email?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Zuvo" <noreply@zuvo.com>',
            to,
            subject: "Verify Your Zuvo Account",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #333;">Welcome to Zuvo!</h2>
                    <p>Please click the button below to verify your email address and complete your registration.</p>
                    <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p>If you did not sign up for this account, you can safely ignore this email.</p>
                </div>
            `
        };

        try {
            await this.getTransporter().sendMail(mailOptions);
            logger.info(`Verification email sent to ${to}`);
        } catch (err) {
            logger.error(`Failed to send verification email to ${to}`, err);
            throw err;
        }
    }

    /**
     * Send Password Reset OTP
     */
    async sendPasswordResetOTP(to, otp) {
        if (!(await this._checkAndUpdateQuota(1))) {
            throw new Error("Daily email quota exceeded (Gmail cap)");
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Zuvo" <noreply@zuvo.com>',
            to,
            subject: "Your Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #333;">Zuvo Security</h2>
                    <p>You requested a password reset. Use the OTP below to proceed:</p>
                    <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you did not request this, please secure your account immediately.</p>
                </div>
            `
        };

        try {
            await this.getTransporter().sendMail(mailOptions);
            logger.info(`Password reset OTP sent to ${to}`);
        } catch (err) {
            logger.error(`Failed to send OTP to ${to}`, err);
            throw err;
        }
    }
}

module.exports = new EmailService();
