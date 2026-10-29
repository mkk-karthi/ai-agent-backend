import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";
import { prisma } from "./prisma";
import { AuthProvider, Role, UserStatus } from "@prisma/client";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error("No email returned from Google"), false);
        }

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // if user previously registered via email/password,
          // update their authProvider to GOOGLE and mark email as verified.
          if (user.authProvider !== "GOOGLE") {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                authProvider: "GOOGLE",
                mailVerifiedAt: user.mailVerifiedAt ?? new Date(),
              },
            });
          }
        } else {
          // New user - create account with verified email, no password.
          user = await prisma.user.create({
            data: {
              email,
              firstName: profile.name?.givenName ?? profile.displayName.split(" ")[0] ?? "User",
              lastName: profile.name?.familyName ?? null,
              authProvider: AuthProvider.GOOGLE,
              mailVerifiedAt: new Date(),
              role: Role.USER,
              status: UserStatus.ACTIVE,
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    },
  ),
);

export default passport;
