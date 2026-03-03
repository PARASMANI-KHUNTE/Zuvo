const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { logger, models } = require("@zuvo/shared");
const User = models.User();

const callbackURL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback";
logger.info(`Passport: Initializing GoogleStrategy with callbackURL: ${callbackURL}`);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Check if user already exists (Include all states to allow reactivation)
        let user = await User.findOne({
            $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ]
        }).setOptions({ includeAllStates: true });

        if (user) {
            // Permanently deleted check
            if (user.accountStatus === "deleted") {
                return done(null, false, { message: "Account has been permanently deleted" });
            }

            let updated = false;

            // Handle reactivation/state transition
            if (user.accountStatus === "deactivated" || user.accountStatus === "pending_deletion") {
                user.accountStatus = "active";
                user.deletionScheduledAt = null;
                updated = true;
            }

            // Update googleId if they previously signed up via email
            if (!user.googleId) {
                user.googleId = profile.id;
                user.isVerified = true;
                updated = true;
            }
            // Update avatar if not set
            if (profile.photos && profile.photos.length > 0 && (!user.avatar || user.avatar === "default-avatar.png")) {
                user.avatar = profile.photos[0].value;
                updated = true;
            }
            if (updated) await user.save();
            return done(null, user);
        }

        // 2. Create new user if doesn't exist
        user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.emails[0].value.split("@")[0] + Math.floor(Math.random() * 1000),
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : "default-avatar.png",
            googleId: profile.id,
            isVerified: true,
            hasSetUsername: false
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
