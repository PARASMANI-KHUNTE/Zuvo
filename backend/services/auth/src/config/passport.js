const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User, logger } = require("@zuvo/shared");

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback",
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Check if user already exists
        let user = await User.findOne({
            $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ]
        });

        if (user) {
            // Update googleId if they previously signed up via email
            if (!user.googleId) {
                user.googleId = profile.id;
                user.isVerified = true; // Google emails are pre-verified
                await user.save();
            }
            return done(null, user);
        }

        // 2. Create new user if doesn't exist
        user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.emails[0].value.split("@")[0] + Math.floor(Math.random() * 1000),
            googleId: profile.id,
            isVerified: true
        });

        logger.info(`New user created via Google: ${user.email}`);
        return done(null, user);
    } catch (err) {
        logger.error("Google Strategy Error", err);
        return done(err, null);
    }
}));

// Note: serializeUser/deserializeUser are NOT needed because we use JWT (session: false)
// passport.authenticate("google", { session: false }) — sessions are handled via JWTs

module.exports = passport;
