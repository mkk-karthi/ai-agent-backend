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
import { sendMail } from "../utils/mail";
import logger from "../utils/logger";

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
    // Check is mail already exist
    const existEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existEmail) {
      throw new ApiError(409, "Email already exist");
    }

    // Hash the password
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

    await this.generateVeifyEmailToken(user.id);

    return user;
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new ApiError(400, "Invalid email & password");
    }

    if (user.status != "ACTIVE") throw new ApiError(401, "Access denied");

    const verify = await comparePassword(input.password, user.password);

    if (!verify) {
      throw new ApiError(400, "Invalid email & password");
    }

    if (!user.mailVerifiedAt) {
      await this.generateVeifyEmailToken(user.id);
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

    try {
      const user = await prisma.user.findFirst({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new ApiError(400, "Invalid Token");
      } else if (user.status != "ACTIVE") {
        await this.logout(refreshToken);
        throw new ApiError(400, "Token revoked");
      }
    } catch {
      throw new ApiError(400, "Invalid Token");
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
      logger.warn("Invalid Token");
      return;
    }

    const refershTokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId: payload.userId, token: refershTokenHash, revokedAt: null },
    });

    if (!storedToken) {
      // throw new ApiError(400, "Token revoked");
      logger.warn("Token revoked");
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

    const VerifyUrl = `${env.FRONTEND_URL}/auth/verify-email/${verificationToken}`;
    const mailContent = `<div style="font-family: Arial, sans-serif, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto;">
      <h1 style="text-align:center; color: blue;">${env.APP_NAME}</h1>
      <h2>Please verify your email address</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thanks for signing up with us! Please click the button below to confirm your email address and activate your account.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <div style="margin: 10px; text-align:center;">
        <a href="${VerifyUrl}" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 30px; display: inline-block; background-color: #414ef9; border-radius: 4px; border: 1px solid #414ef9;">Verify Email Address</a>
        </div>
      <p>BIf the above link does not work for you, copy this link and paste in a new window: <a href="${VerifyUrl}" target="_blank">${VerifyUrl}</a></p>
      <br>
      <p>Best regards,</p>
      <p>The ${env.APP_NAME} Team</p>
    </div>`;
    return await sendMail(user.email, "Mail Verification", mailContent);
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
      logger.warn("Email not found");
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
    const mailContent = `<div style="font-family: Arial, sans-serif, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto;">
      <p>Hi ${user.firstName},</p>
      <p>Use the following One-Time Password (OTP) to complete your password reset request. This code is confidential and should not be shared. </p>
      <div style="text-align:center;">
        <strong style=" background-color: #f0f7fc; border: 1px dashed #3498db; border-radius: 6px; padding: 15px 30px; letter-spacing: 5px; font-size: 28px; font-family: monospace; display: inline-block;">
          ${otp}
        </strong>
      </div>
      <p>This OTP is valid for the next ${env.RESET_PASSWORD_EXPIRES_IN} minutes. If you did not request this change, please secure your account immediately. </p>
      <br>
      <p>Thanks,</p>
      <p>The ${env.APP_NAME} Team</p>
    </div>`;
    return await sendMail(user.email, "Reset your password", mailContent);
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
