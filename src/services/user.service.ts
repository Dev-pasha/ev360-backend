import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import Logger from "../config/logger";
import { User } from "../entities/user.entity";

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async getUserById(userId: number): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
      });
    } catch (error) {
      Logger.error(`Error getting user by ID ${userId}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
      });
    } catch (error) {
      Logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  async getUserIdByEmail(email: string): Promise<number | null> {
    try {
      const user = await this.getUserByEmail(email);
      return user ? user.id : null;
    } catch (error) {
      Logger.error(`Error getting user ID by email ${email}:`, error);
      throw error;
    }
  }
  
}
