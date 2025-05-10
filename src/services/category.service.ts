import AppDataSource from "../config/database";
import { Category } from "../entities/player-category.entity";
import { DataSource } from "typeorm";

export class CategoryService {
  private categoryRepositry;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.categoryRepositry = this.dataSource.getRepository(Category);
  }

  async createCategory(
    groupId: number,
    categoryData: {
      name: string;
      description?: string;
    }
  ): Promise<Category> {
    console.log("categoryData", categoryData);

    const category = this.categoryRepositry.create({
      name: categoryData.name,
      description: categoryData.description || "",
      group: { id: groupId },
    });
    return await this.categoryRepositry.save(category);
  }

  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepositry.findOne({
      where: { id },
      relations: ["group"],
    });
  }

  async getCategoriesByGroupId(groupId: number): Promise<Category[]> {
    return await this.categoryRepositry.find({
      where: { group: { id: groupId } },
      order: { name: "ASC" },
    });
  }

  async updateCategory(
    id: number,
    categoryData: {
      name?: string;
      description?: string;
    }
  ): Promise<Category | null> {
    const category = await this.categoryRepositry.findOne({
      where: {
        name: categoryData.name,
        description: categoryData.description,
      },
    });
    if (!category) return null;

    Object.assign(category, {
      name: categoryData.name,
      description: categoryData.description,
    });
    return await this.categoryRepositry.save(category);
  }

  async deleteCategory(
    id: number,
    categoryData: {
      name?: string;
      description?: string;
    }
  ): Promise<void> {
    const category = await this.categoryRepositry.findOne({
      where: {
        name: categoryData.name,
      },
    });

    if (!category) return;

    await this.categoryRepositry.remove(category);
  }
}
