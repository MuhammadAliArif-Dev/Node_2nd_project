const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleEmail = profile.emails[0].value;
                const googleId = profile.id;

                let user = await User.findOne({ where: { googleId } });

                if (!user) {
                    user = await User.findOne({ where: { email: googleEmail } });

                    if (user) {
                        user.googleId = googleId;
                        await user.save();
                    } else {
                        user = await User.create({
                            first_name: profile.name?.givenName || profile.displayName,
                            last_name: profile.name?.familyName || "",
                            email: googleEmail,
                            googleId: googleId,
                            role: "student"
                        });
                    }
                }
                // User ready hai, done() call karein
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

module.exports = passport;
