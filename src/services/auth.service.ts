

// src/services/AuthService.ts
import { AppDataSource } from "../config/database";
import * as bcrypt from "bcrypt";
import { User } from "../entities/user.entity";
import { UserGroupRole } from "../entities/user-group-role.entity";
import * as jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
import authConfig from "../config/auth";
import Logger from "../config/logger";
import { Group } from "../entities/group.entity";
import { Role } from "../entities/role.entity";
import { Subscription } from "../entities/subscription.entity";
import { CookieOptions } from "express";

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface TokenPayload {
  sub: number;
  email?: string;
  type: string;
  groupId?: number;
  roleId?: number;
  groupRoles?: any[];
  subscriptionInfo?: any;
  permissions?: any;
  iat?: number;
  exp?: number;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    groupRoles: any[];
    subscriptionInfo?: any;
    permissions?: any;
    usageStats?: any;
  };
  cookies: { accessToken: CookieOptions; refreshToken: CookieOptions };
}

interface RegistrationData {
  password: string;
  firstName: string;
  lastName: string;
}

interface CookieConfig {
  accessToken: CookieOptions;
  refreshToken: CookieOptions;
}

export class AuthService {
  private userRepository;
  private userGroupRoleRepository;
  private groupRepository;
  private roleRepository;
  private subscriptionRepository;
  private cookieConfig: CookieConfig = {
    accessToken: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: this.getExpiresInMs(authConfig.jwtExpiresIn, 5 * 60 * 60 * 1000), // 5 hours default
      path: "/",
    },
    refreshToken: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: this.getExpiresInMs(
        authConfig.jwtRefreshExpiresIn,
        7 * 24 * 60 * 60 * 1000
      ), // 7 days default
      path: "/api/v1/auth/refresh", // Restrict to refresh endpoint only
    },
  };

  constructor(private dataSource: DataSource = AppDataSource) {
    // Get from environment variables in production
    this.userRepository = this.dataSource.getRepository(User);
    this.groupRepository = this.dataSource.getRepository(Group);
    this.roleRepository = this.dataSource.getRepository(Role);
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
    this.subscriptionRepository = this.dataSource.getRepository(Subscription);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }

    return null;
  }

  async login(user: User): Promise<
    LoginResult & {
      cookies: { accessToken: CookieOptions; refreshToken: CookieOptions };
    }
  > {
    try {
      // Get user's groups and roles
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: {
          user: { id: user.id },
        },
        relations: {
          group: {
            subscription: {
              plan: true,
            },
          },
          role: true,
        },
      });

      // Format for token
      const groupRoles = userGroupRoles.map((ugr) => ({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
        subscription: ugr.group.subscription,
        plan: ugr.group.subscription?.plan,
      }));

      const subscriptionSummary = await this.calculateSubscriptionSummary(
        user.id,
        userGroupRoles
      );

      const usageStats = await this.calculateUsageStats(
        user.id,
        userGroupRoles
      );
      const permissions = this.determineUserPermissions(
        subscriptionSummary,
        usageStats
      );

      // Create JWT payload
      const payload: TokenPayload = {
        type: "email_verification",
        sub: user.id,
        email: user.email,
        groupRoles,
        subscriptionInfo: subscriptionSummary,
        permissions,
      };

      const accessToken = jwt.sign(payload, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtExpiresIn) || "5h",
      });
      const refreshToken = jwt.sign({ sub: user.id }, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtRefreshExpiresIn) || "1d",
      });

      // Update last login
      await this.userRepository.update(user.id, {
        refreshToken: await bcrypt.hash(refreshToken, 10),
        lastLoginAt: new Date(),
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          groupRoles,
          subscriptionInfo: subscriptionSummary,
          permissions,
          usageStats,
        },
        cookies: {
          accessToken: {
            ...this.cookieConfig.accessToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtExpiresIn,
              5 * 60 * 60 * 1000
            ),
          },
          refreshToken: {
            ...this.cookieConfig.refreshToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtRefreshExpiresIn,
              7 * 24 * 60 * 60 * 1000
            ),
          },
        },
      };
    } catch (error) {
      Logger.error("Error in login:", error);
      throw new Error("Login failed");
    }
  }

  async register(userData: UserData): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const newUser = this.userRepository.create({
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      emailVerified: false,
    });

    return this.userRepository.save(newUser);
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    cookies: {
      accessToken: CookieOptions;
      refreshToken: CookieOptions;
    };
  }> {
    try {
      // Verify token
      const payload: any = jwt.verify(refreshToken, authConfig.jwtSecret);

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify token matches stored hash
      const isValidToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken || ""
      );

      if (!isValidToken) {
        throw new Error("Invalid refresh token");
      }

      // Get user's groups and roles
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { user: { id: user.id } },
        relations: [
          "group",
          "role",
          "group.subscription",
          "group.subscription.plan",
        ],
      });

      // Format group roles for token
      const groupRoles = userGroupRoles.map((ugr) => ({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
        subscription: ugr.group.subscription,
        plan: ugr.group.subscription?.plan,
      }));

      // Create new tokens
      const newAccessToken = jwt.sign(
        { sub: user.id, email: user.email, groupRoles },
        authConfig.jwtSecret,
        { expiresIn: Number(authConfig.jwtExpiresIn) || "1h" }
      );

      const newRefreshToken = jwt.sign({ sub: user.id }, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtRefreshExpiresIn) || "1d",
      });

      // Update stored refresh token
      await this.userRepository.update(user.id, {
        refreshToken: await bcrypt.hash(newRefreshToken, 10),
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        cookies: {
          accessToken: {
            ...this.cookieConfig.accessToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtExpiresIn,
              5 * 60 * 60 * 1000
            ),
          },
          refreshToken: {
            ...this.cookieConfig.refreshToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtRefreshExpiresIn,
              7 * 24 * 60 * 60 * 1000
            ),
          },
        },
      };
    } catch (error) {
      Logger.error("Error refreshing token:", error);
      throw new Error("Invalid or expired refresh token");
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify token
      const payload: any = jwt.verify(token, authConfig.jwtSecret);

      if (payload.type !== "password_reset") {
        throw new Error("Invalid token type");
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await this.userRepository.update(user.id, {
        passwordHash,
        // Invalidate refresh token when password changes
        refreshToken: undefined,
      });

      return true;
    } catch (error) {
      Logger.error("Error resetting password:", error);
      throw new Error("Invalid or expired token");
    }
  }

  async sendVerificationEmail(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { sub: user.id, type: "email_verification" },
      authConfig.jwtSecret,
      { expiresIn: "24h" }
    );

    // In a real app, send this token via email
    // For testing, return the token directly
    return {
      userId: user.id,
      verificationToken,
    };
  }

  async updateProfile(userId: number, data: Partial<User>): Promise<User> {
    try {
      await this.userRepository.update(userId, data);
      const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
      if (!updatedUser) {
        throw new Error("User not found");
      }
      return updatedUser;
    } catch (error) {
      Logger.error("Error updating user profile:", error);
      throw new Error("Profile update failed");
    }
  }



  async verifyEmail(token: string) {
    try {
      // Verify token
      const payload: any = jwt.verify(token, authConfig.jwtSecret);

      if (payload.type !== "email_verification") {
        Logger.error("Invalid token type");
        throw new Error("Invalid token type");
      }

      // Update user
      await this.userRepository.update(payload.sub, {
        emailVerified: true,
      });

      return true;
    } catch (error) {
      Logger.error("Error verifying email:", error);
      throw new Error("Invalid or expired token");
    }
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        "id",
        "email",
        "firstName",
        "lastName",
        "emailVerified",
        "lastLoginAt",
        "createdAt",
        "updatedAt",
      ],
      relations: [
        "userGroupRoles.group",
        "userGroupRoles.role",
        "subscriptions",
        "subscriptions.plan",
      ],
    });

    if (!user) {
      Logger.error("User not found");
      throw new Error("User not found");
    }

    // check for subscription if not found then found out he user whos is admin of the group and get the subscription from there
    if (!user.subscriptions || user.subscriptions.length === 0) {
      const groupRoles = await this.userGroupRoleRepository.find({
        where: { user: { id: user.id } },
        relations: ["group", "group.subscription", "group.subscription.plan"],
      });

      // Find the first active subscription from groups
      const activeSubscription = groupRoles
        .map((ugr) => ugr.group.subscription)
        .find(
          (sub) =>
            sub &&
            (sub.status === "active" || sub.status === "trial") &&
            sub.plan
        );

      if (activeSubscription) {
        user.subscriptions = [activeSubscription];
      }
    }

    // console.log("User data:", user);


    // ⭐ OPTIONAL: Format the response for better frontend consumption
    const formattedUser = {
      ...user,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      activeSubscription:
        user.subscriptions?.find(
          (sub) => sub.status === "active" || sub.status === "trial"
        ) || null,
      groups:
        user.userGroupRoles?.map((ugr) => ({
          id: ugr.group.id,
          name: ugr.group.name,
          role: ugr.role.name,
          joinedAt: ugr.createdAt,
        })) || [],
    };

    // console.log("Formatted user data:", formattedUser);

    return formattedUser;
  }

  async logout(userId: number) {
    // Clear refresh token
    await this.userRepository.update(userId, {
      refreshToken: undefined,
    });

    return true;
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return false;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { sub: user.id, type: "password_reset" },
      authConfig.jwtSecret,
      { expiresIn: "1h" }
    );

    // In a real app, send this token via email
    // For testing, return the token directly
    console.log("Reset token: ", resetToken);
    return {
      userId: user.id,
      resetToken,
    };
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, authConfig.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async validateInvitationToken(token: string): Promise<any> {
    try {
      // Verify token
      const payload: any = jwt.verify(token, authConfig.jwtSecret);

      if (payload.type !== "invitation") {
        throw new Error("Invalid token type");
      }

      // Find user, group and role
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new Error("User not found");
      }

      const group = await this.groupRepository.findOne({
        where: { id: payload.groupId },
      });
      if (!group) {
        throw new Error("Group not found");
      }

      const role = await this.roleRepository.findOne({
        where: { id: payload.roleId },
      });
      if (!role) {
        throw new Error("Role not found");
      }

      // Check if account already activated
      if (user.passwordHash) {
        throw new Error("Account already activated");
      }

      return {
        email: user.email,
        group: {
          id: group.id,
          name: group.name,
        },
        role: {
          id: role.id,
          name: role.name,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Validate invitation token error: ${error.message}`);
      } else {
        Logger.error(
          "Validate invitation token error: An unknown error occurred"
        );
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  }

  async completeRegistration(
    token: string,
    userData: { password: string; firstName: string; lastName: string }
  ): Promise<
    LoginResult & {
      cookies: { accessToken: CookieOptions; refreshToken: CookieOptions };
    }
  > {
    try {
      // Verify token
      const payload: any = jwt.verify(token, authConfig.jwtSecret);

      if (payload.type !== "invitation") {
        throw new Error("Invalid token type");
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.passwordHash) {
        throw new Error("Account already activated");
      }

      // Update user with provided data
      const passwordHash = await bcrypt.hash(userData.password, 10);

      user.passwordHash = passwordHash;
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.emailVerified = true; // Auto-verify email since we know they received the invitation

      await this.userRepository.save(user);

      // Generate login tokens

      // Get user's groups and roles
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { user: { id: user.id } },
        relations: ["group", "role", "group.subscription"],
      });

      // Format group roles for token
      const groupRoles = userGroupRoles.map((ugr) => ({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
        subscription: ugr.group.subscription,
        plan: ugr.group.subscription?.plan,
      }));

      // Create payload
      const tokenPayload = {
        type: "invitation",
        sub: user.id,
        email: user.email,
        groupRoles,
      };

      // Generate tokens
      const accessToken = jwt.sign(tokenPayload, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtExpiresIn) || "1h",
      });
      const refreshToken = jwt.sign({ sub: user.id }, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtRefreshExpiresIn) || "1d",
      });

      // Update user with refresh token
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          groupRoles,
        },
        cookies: {
          accessToken: {
            ...this.cookieConfig.accessToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtExpiresIn,
              5 * 60 * 60 * 1000
            ),
          },
          refreshToken: {
            ...this.cookieConfig.refreshToken,
            maxAge: this.getExpiresInMs(
              authConfig.jwtRefreshExpiresIn,
              7 * 24 * 60 * 60 * 1000
            ),
          },
        },
      };
    } catch (error) {
      Logger.error("Complete registration error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to complete registration");
    }
  }

  private getExpiresInMs(configValue: string, defaultMs: number): number {
    if (!configValue) return defaultMs;

    const numValue = Number(configValue);
    if (!isNaN(numValue)) return numValue * 1000; // Convert seconds to ms

    // Handle string format like "1h", "7d"
    const unit = configValue.slice(-1);
    const value = parseInt(configValue.slice(0, -1));

    switch (unit) {
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return defaultMs;
    }
  }

  getLogoutCookies(): {
    accessToken: CookieOptions;
    refreshToken: CookieOptions;
  } {
    return {
      accessToken: {
        ...this.cookieConfig.accessToken,
        maxAge: 0,
      },
      refreshToken: {
        ...this.cookieConfig.refreshToken,
        maxAge: 0,
      },
    };
  }

  // Calculate subscription summary
  private async calculateSubscriptionSummary(
    userId: number,
    userGroupRoles: any[]
  ) {
    // Find active subscription from user's groups
    console.log("Calculating subscription summary for user:", userId);
    console.log("User group roles:", userGroupRoles);

    const activeSubscription = userGroupRoles.find(
      (ugr) =>
        ugr.group.subscription?.status === "active" ||
        ugr.group.subscription?.status === "trial"
    )?.group.subscription;

    if (!activeSubscription) {
      return {
        hasActiveSubscription: false,
        status: "no_subscription",
        currentPlan: null,
        trialInfo: null,
      };
    }

    return {
      hasActiveSubscription: true,
      status: activeSubscription.status,
      currentPlan: {
        id: activeSubscription.plan.id,
        name: activeSubscription.plan.name,
        price: activeSubscription.plan.price,
        billingCycle: activeSubscription.plan.billing_cycle,
        limits: {
          maxGroups: activeSubscription.plan.max_groups,
          maxUsersPerGroup: activeSubscription.plan.max_users_per_group,
          maxPlayersPerGroup: activeSubscription.plan.max_players_per_group,
        },
        isCustom: activeSubscription.plan.is_custom,
      },
      trialInfo:
        activeSubscription.status === "trial"
          ? {
              trialEndDate: activeSubscription.trial_end_date,
              daysRemaining: this.calculateDaysRemaining(
                activeSubscription.trial_end_date
              ),
            }
          : null,
      subscriptionEndDate: activeSubscription.end_date,
    };
  }

  // Calculate current usage
  private async calculateUsageStats(userId: number, userGroupRoles: any[]) {
    const groupsCount = userGroupRoles.length;

    // Get max users in any group (you'd need to query this)
    const maxUsersInGroup = await this.getMaxUsersInUserGroups(userId);

    return {
      groups: {
        used: groupsCount,
        // You'll need to get max from subscription
        remaining: 0, // Calculate based on plan limits
        percentage: 0, // Calculate based on plan limits
      },
      users: {
        maxInAnyGroup: maxUsersInGroup,
        // Add more user stats as needed
      },
    };
  }

  // Determine what user can do based on subscription
  private determineUserPermissions(subscriptionSummary: any, usageStats: any) {
    if (!subscriptionSummary.hasActiveSubscription) {
      return {
        canCreateGroup: false,
        canInviteUsers: false,
        canAccessPremiumFeatures: false,
        reason: "No active subscription",
      };
    }

    const plan = subscriptionSummary.currentPlan;

    return {
      canCreateGroup: usageStats.groups.used < plan.limits.maxGroups,
      canInviteUsers: true, // Based on your business logic
      canAccessPremiumFeatures: true,
      maxGroupsAllowed: plan.limits.maxGroups,
      maxUsersPerGroupAllowed: plan.limits.maxUsersPerGroup,
      maxPlayersPerGroupAllowed: plan.limits.maxPlayersPerGroup,
    };
  }

  /**
   * Calculate remaining days until trial end date
   */
  private calculateDaysRemaining(endDate: Date | null): number {
    if (!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);

    // If end date is in the past, return 0
    if (end <= now) return 0;

    // Calculate difference in milliseconds
    const timeDifference = end.getTime() - now.getTime();

    // Convert to days and round up
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return Math.max(0, daysRemaining);
  }

  /**
   * Get the maximum number of users in any group that belongs to this user
   */
  private async getMaxUsersInUserGroups(userId: number): Promise<number> {
    try {
      // First, get all groups the user belongs to
      const userGroups = await this.userGroupRoleRepository
        .createQueryBuilder("ugr")
        .leftJoin("ugr.group", "group")
        .leftJoin("ugr.user", "user")
        .select("group.id")
        .where("user.id = :userId", { userId })
        .getRawMany();

      if (userGroups.length === 0) {
        return 0;
      }

      const groupIds = userGroups.map((g) => g.id);

      // Then find the group with the most users
      const result = await this.userGroupRoleRepository
        .createQueryBuilder("ugr")
        .leftJoin("ugr.group", "group")
        .select("group.id", "groupId")
        .addSelect("COUNT(ugr.userId)", "userCount")
        .where("group.id IN (:...groupIds)", { groupIds })
        .groupBy("group.id")
        .orderBy("COUNT(ugr.userId)", "DESC")
        .limit(1)
        .getRawOne();

      return parseInt(result?.userCount || "0");
    } catch (error) {
      Logger.error("Error getting max users in user groups:", error);
      return 0;
    }
  }
}

