import { EvaluationTemplate } from "../entities/evaluation-template.entity";
import { AppDataSource } from "../config/database";
import { DataSource } from "typeorm";

export class EvaluationTemplateService {
  private evaluationTemplateRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.evaluationTemplateRepository =
      this.dataSource.getRepository(EvaluationTemplate);
  }

  async getEvaluationTemplates(): Promise<EvaluationTemplate[]> {
    const templates = await this.evaluationTemplateRepository.find({
      relations: [
        "categories",
        "categories.skills",
        "categories.skills.metrics",
        "custom_labels",
      ],
    });
    return templates;
  }

  async getEvaluationTemplateById(
    id: string
  ): Promise<EvaluationTemplate | null> {
    const template = await this.evaluationTemplateRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "categories",
        "categories.skills",
        "categories.skills.metrics",
        "custom_labels",
      ],
    });
    return template;
  }
}
