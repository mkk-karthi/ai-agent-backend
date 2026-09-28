import { prisma } from "../config/prisma";
import { Role, type Prisma, type User } from "@prisma/client";
import type { changePasswordInput, updateUserinput } from "../modules/user.schema";
import { comparePassword, hashPassword } from "../utils/password";
import { ApiError } from "../utils/api-error";
import type { PaginationType } from "../modules/common.schema";

export const RoleValueMap = Object.keys(Role).reduce(
  (acc, key, index) => {
    acc[key as Role] = index + 1;
    return acc;
  },
  {} as Record<Role, number>,
);

type UserWithRoleDetails = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  authProvider: unknown;
  createdAt: Date;
  roleId?: number;
};

export const userService = {
  async getUsers({ page, pageSize, sorting, search }: PaginationType) {
    const whereCondition: Prisma.UserWhereInput = {
      role: {
        not: "ADMIN",
      },
      email: {
        contains: search,
        mode: "insensitive",
      },
    };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          authProvider: true,
        },
        skip: page * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({ where: whereCondition }),
    ]);

    return { data: users, total, pageSize, page };
  },

  async getUser(id: string) {
    const user = (await prisma.user.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    })) as UserWithRoleDetails | null;

    if (user) {
      user.roleId = RoleValueMap[user.role];
    }

    return user;
  },

  async updateUser(id: string, input: updateUserinput, authUserId: string) {
    let update: Partial<User> = {};
    if (input.firstName) update["firstName"] = input.firstName;
    if (input.lastName) update["lastName"] = input.lastName;

    const authUser = await prisma.user.findFirst({ where: { id: authUserId } });
    if (authUser?.role == "ADMIN" && input.role) update["role"] = input.role;

    const updateUser = await prisma.user.update({
      where: { id },
      data: update,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    return updateUser;
  },

  async changePassword(id: string, input: changePasswordInput) {
    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) throw new ApiError(400, "Id not found");

    // verify old password
    const verify = await comparePassword(input.oldPassword, user.password);
    if (!verify) {
      throw new ApiError(400, "Invalid old password");
    }

    // Verify new password is already exists
    const compare = await comparePassword(input.password, user.password);
    if (compare) {
      throw new ApiError(400, "Password have already taken, create new password");
    }

    const passwordHash = await hashPassword(input.password);
    const updateUser = await prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });
  },
};
