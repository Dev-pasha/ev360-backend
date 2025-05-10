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


export class AuthService {
  private userRepository;
  private userGroupRoleRepository;
  private groupRepository;
  private roleRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    // Get from environment variables in production
    this.userRepository = this.dataSource.getRepository(User);
    this.groupRepository = this.dataSource.getRepository(Group);
    this.roleRepository = this.dataSource.getRepository(Role);
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }

    return null;
  }

  async login(
    user: User
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Get user's groups and roles
    const userGroupRoles = await this.userGroupRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ["group", "role"],
    });

    // Format for token
    const groupRoles = userGroupRoles.map((ugr) => ({
      groupId: ugr.group.id,
      groupName: ugr.group.name,
      roleId: ugr.role.id,
      roleName: ugr.role.name,
    }));

    // Create JWT payload
    const payload = {
      type: "email_verification",
      sub: user.id,
      email: user.email,
      groupRoles,
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
      },
    };
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
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

  async refreshToken(refreshToken: string) {
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
        relations: ["group", "role"],
      });

      // Format group roles for token
      const groupRoles = userGroupRoles.map((ugr) => ({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
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
      };
    } catch (error) {
      if (error instanceof Error) {
      } else {
      }
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
    });

    if (!user) {
      Logger.error("User not found");
      throw new Error("User not found");
    }

    return user;
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
  ): Promise<any> {
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
        relations: ["group", "role"],
      });

      // Format group roles for token
      const groupRoles = userGroupRoles.map((ugr) => ({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
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
      };
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Complete registration error: ${error.message}`);
      } else {
        Logger.error("Complete registration error: An unknown error occurred");
      }
    }
  }

 
}
