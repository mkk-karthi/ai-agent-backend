import { env } from "../config/env";
import { prisma } from "../config/prisma";
import type {
  forgotPasswordInput,
  LoginInput,
  RegisterInput,
  resetPasswordInput,
} from "../modules/auth.schema";
import { ApiError } from "../utils/api-error";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import { decryption, encryption, generateOtp, hashToken } from "../utils/cryptoUtils";
import { Role, type User } from "@prisma/client";

export const RoleValueMap: Record<Role, number> = {
  [Role.ADMIN]: 1,
  [Role.USER]: 2,
};

const generateUsername = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  const partBeforeAt = normalized.split("@")[0] ?? "";
  const username = partBeforeAt.replace(/[^a-z0-9_]/g, "");

  return username || "user";
};

export const authService = {
  async register(input: RegisterInput) {
    const existEmail = await prisma.user.findUnique({ where: { email: input.email } });

    if (existEmail) {
      throw new ApiError(409, "Email already exist");
    }

    const password = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password,
        firstName: generateUsername(input.email),
        role: "USER",
        authProvider: "LOCAL",
      } as User,
      select: {
        id: true,
        email: true,
      },
    });

    this.generateVeifyEmailToken(user.id);

    return user;
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new ApiError(400, "Invalid email & password");
    }

    const verify = await comparePassword(input.password, user.password);

    if (!verify) {
      throw new ApiError(400, "Invalid email & password");
    }

    if (!user.mailVerifiedAt) {
      this.generateVeifyEmailToken(user.id);
      throw new ApiError(400, "Please verify the email");
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });
    const refershTokenHash = hashToken(refreshToken);
    const refershTokenExpiry = new Date(
      Date.now() + parseInt(env.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    );

    await prisma.refreshToken.create({
      data: { token: refershTokenHash, userId: user.id, expiredAt: refershTokenExpiry },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roleId: RoleValueMap[user.role],
        mailVerifiedAt: user.mailVerifiedAt,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  },

  async createAccessToken(refreshToken: string) {
    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(400, "Invalid Token");
    }

    const refershTokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId: payload.userId, token: refershTokenHash, revokedAt: null },
    });

    if (!storedToken) {
      throw new ApiError(400, "Token revoked");
    }

    const accessToken = generateAccessToken({ userId: payload.userId });

    return accessToken;
  },

  async logout(refreshToken: string) {
    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      // throw new ApiError(400, "Invalid Token");
      console.error("Invalid Token");
      return;
    }

    const refershTokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId: payload.userId, token: refershTokenHash, revokedAt: null },
    });

    if (!storedToken) {
      // throw new ApiError(400, "Token revoked");
      console.error("Token revoked");
      return;
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
  },

  async generateVeifyEmailToken(userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new ApiError(400, "User not found");

    await prisma.session.updateMany({
      data: { expiredAt: new Date() },
      where: { key: "verifyEmailToken", userId },
    });

    const verificationToken = encryption(user.email);
    await prisma.session.create({
      data: {
        key: "verifyEmailToken",
        value: verificationToken,
        expiredAt: new Date(Date.now() + env.VERIFY_MAIL_EXPIRES_IN * 60 * 1000),
        userId,
      },
    });
    console.log("verifyEmailToken", verificationToken);
  },

  async verifyMail(token: string) {
    let email;
    try {
      email = decryption(token);
    } catch {
      throw new ApiError(400, "Invalid Token");
    }

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new ApiError(400, "Invalid Token");
    }

    const session = await prisma.session.findFirst({
      where: { key: "verifyEmailToken", value: token, userId: user.id },
    });

    if (!session) {
      throw new ApiError(400, "Invalid Token");
    } else if (!session.expiredAt || session.expiredAt < new Date()) {
      throw new ApiError(400, "Token expired");
    }

    await prisma.user.update({
      data: { mailVerifiedAt: new Date() },
      where: { id: user.id },
    });

    await prisma.session.update({
      data: { expiredAt: new Date() },
      where: { id: session.id },
    });
  },

  async forgotPassword(input: forgotPasswordInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      // throw new ApiError(400, "Invalid email & password");
      console.log("Email not found");
      return;
    }
    await prisma.session.updateMany({
      data: { expiredAt: new Date() },
      where: { key: "resetPassword", userId: user.id },
    });

    const otp = generateOtp(6);
    const hashOtp = hashToken(otp);
    await prisma.session.create({
      data: {
        key: "resetPassword",
        value: hashOtp,
        expiredAt: new Date(Date.now() + env.RESET_PASSWORD_EXPIRES_IN * 60 * 1000),
        userId: user.id,
      },
    });
    console.log("otp", otp);
  },

  async resetPassword(input: resetPasswordInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new ApiError(400, "Invalid OTP");
    }

    const hashOtp = hashToken(input.otp);

    const session = await prisma.session.findFirst({
      where: {
        key: "resetPassword",
        value: hashOtp,
        userId: user.id,
      },
    });
    if (!session) {
      throw new ApiError(400, "OTP invalid");
    } else if (!session.expiredAt || session.expiredAt < new Date()) {
      throw new ApiError(400, "OTP expired");
    }

    const verify = await comparePassword(input.password, user.password);

    if (verify) {
      throw new ApiError(400, "Password have already taken, create new password");
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.user.update({ data: { password: passwordHash }, where: { id: user.id } });

    await prisma.session.update({
      data: { expiredAt: new Date() },
      where: { id: session.id },
    });
  },
};
