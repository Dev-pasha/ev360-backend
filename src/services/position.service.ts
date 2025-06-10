import AppDataSource from "../config/database";
import { Position } from "../entities/group-position.entity";
import { DataSource } from "typeorm";
import Logger from "../config/logger";
import { Group } from "../entities/group.entity";

export class PositionService {
  private positionRepository;
  private groupRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.positionRepository = this.dataSource.getRepository(Position);
    this.groupRepository = this.dataSource.getRepository(Group);
  }

  async createPosition(
    groupId: number,
    positionData: {
      name: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<Position> {
    let group = null;

    if (groupId) {
      group = await this.groupRepository.findOne({
        where: { id: groupId },
      });
      if (!group) {
        throw new Error("Group not found");
      }
    }

    const position = this.positionRepository.create({
      ...positionData,
      ...(group && { group }),
    });

    return await this.positionRepository.save(position);
  }

 async getPositions(groupId: number): Promise<Position[]> {
    const positions = await this.positionRepository.find({
      where: {
        group: { id: groupId }
      },
      // relations: ["group"], // uncomment if you need group data
    });

    return positions;
}

  async updatePosition(
    positionId: number,
    positionData: {
      name?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<Position> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      throw new Error("Position not found");
    }

    if (positionData.name !== undefined) position.name = positionData.name;
    if (positionData.description !== undefined)
      position.description = positionData.description;
    if (positionData.is_active !== undefined)
      position.is_active = positionData.is_active;

    return await this.positionRepository.save(position);
  }

  async deletePosition(positionId: number): Promise<void> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      throw new Error("Position not found");
    }

    await this.positionRepository.remove(position);
  }
}
