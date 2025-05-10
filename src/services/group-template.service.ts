import AppDataSource from "../config/database";
import { EvaluationTemplate } from "../entities/evaluation-template.entity";
import { GroupTemplateCategory } from "../entities/group-template-category.entity";
import { GroupTemplateCustomLabel } from "../entities/group-template-custom-lable.entity";
import { GroupTemplateMetric } from "../entities/group-template-metric-score.entity";
import { GroupTemplateSkill } from "../entities/group-template-skill.entity";
import { GroupTemplate } from "../entities/group-template.entity";
import { Group } from "../entities/group.entity";
import { DataSource } from "typeorm";

export class GroupTemplateService {
  private groupRepository;
  private evaluationRepository;
  private groupTemplateRepository;
  private groupTemplateCategoryRepository;
  private groupTemplateSkillRepository;
  private groupTemplateMetricRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.groupRepository = this.dataSource.getRepository(Group);
    this.evaluationRepository =
      this.dataSource.getRepository(EvaluationTemplate);
    this.groupTemplateRepository = this.dataSource.getRepository(GroupTemplate);
    this.groupTemplateCategoryRepository = this.dataSource.getRepository(
      GroupTemplateCategory
    );
    this.groupTemplateSkillRepository =
      this.dataSource.getRepository(GroupTemplateSkill);
    this.groupTemplateMetricRepository =
      this.dataSource.getRepository(GroupTemplateMetric);
  }

  async assignTemplateToGroup(
    groupId: number,
    templateId: number
  ): Promise<GroupTemplate> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error("Group not found");
    }

    const template = await this.evaluationRepository.findOne({
      where: { id: templateId },
      relations: [
        "categories",
        "categories.skills",
        "categories.skills.metrics",
        "custom_labels",
      ],
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Create group template
      const groupTemplate = transactionalEntityManager.create(GroupTemplate, {
        group,
        baseTemplate: template,
        isCustomized: false,
      });

      await transactionalEntityManager.save(groupTemplate);

      // Create categories, skills, metrics, and custom labels
      for (const category of template.categories) {
        const groupCategory = transactionalEntityManager.create(
          GroupTemplateCategory,
          {
            name: category.name,
            groupTemplate,
            baseCategory: category,
            isCustom: false,
          }
        );

        await transactionalEntityManager.save(groupCategory);

        for (const skill of category.skills) {
          const groupSkill = transactionalEntityManager.create(
            GroupTemplateSkill,
            {
              name: skill.name,
              category: groupCategory,
              baseSkill: skill,
              isCustom: false,
            }
          );

          await transactionalEntityManager.save(groupSkill);

          for (const metric of skill.metrics) {
            const groupMetric = transactionalEntityManager.create(
              GroupTemplateMetric,
              {
                name: metric.name,
                order: metric.order,
                metric_type: metric.metric_type,
                min_value: metric.min_value,
                max_value: metric.max_value,
                step: metric.step,
                units: metric.units,
                lower_score_is_better: metric.lower_score_is_better,
                info: metric.info,
                meta: metric.meta,
                skill: groupSkill,
                baseMetric: metric,
                isCustom: false,
              }
            );

            await transactionalEntityManager.save(groupMetric);
          }
        }
      }

      for (const label of template.custom_labels) {
        const groupLabel = transactionalEntityManager.create(
          GroupTemplateCustomLabel,
          {
            label: label.label,
            type: label.type,
            options: label.options,
            groupTemplate,
            baseCustomLabel: label,
            isCustom: false,
          }
        );

        await transactionalEntityManager.save(groupLabel);
      }

      return groupTemplate;
    });
  }

  async getGroupTemplates(groupId: number): Promise<GroupTemplate[]> {
    return this.groupTemplateRepository.find({
      where: { group: { id: groupId } },
      relations: ["baseTemplate"],
    });
  }

  async getGroupTemplateDetails(
    groupTemplateId: number
  ): Promise<GroupTemplate> {
    console.log("Fetching group template details...");

    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
      relations: [
        "baseTemplate",
        "categories",
        "categories.skills",
        "categories.skills.metrics",
        "customLabels",
      ],
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    return groupTemplate;
  }

  async updateGroupTemplate(
    groupTemplateId: number,
    updates: any
  ): Promise<GroupTemplate> {
    // Get group template
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
      relations: [
        "categories",
        "categories.skills",
        "categories.skills.metrics",
        "customLabels",
      ],
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    // Use transaction for complex updates
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Update basic template info
      if (updates.customName) {
        groupTemplate.customName = updates.customName;
        groupTemplate.isCustomized = true;
      }

      await transactionalEntityManager.save(groupTemplate);

      // Handle categories, skills, metrics updates if provided
      if (updates.categories && Array.isArray(updates.categories)) {
        // This would be a complex process to update/add/remove categories, skills, metrics
        // Simplified example - in a real app you'd need detailed logic to handle all cases
        for (const categoryUpdate of updates.categories) {
          // Find category
          const category = groupTemplate.categories.find(
            (c) => c.id === categoryUpdate.id
          );

          if (category) {
            // Update existing category
            if (categoryUpdate.name !== undefined) {
              category.name = categoryUpdate.name;
              category.isCustom = true;
            }

            await transactionalEntityManager.save(category);

            // Update skills if provided
            if (categoryUpdate.skills && Array.isArray(categoryUpdate.skills)) {
              // Handle skills updates...
            }
          } else if (categoryUpdate.name) {
            // Add new category
            const newCategory = transactionalEntityManager.create(
              GroupTemplateCategory,
              {
                name: categoryUpdate.name,
                groupTemplate,
                isCustom: true,
              }
            );

            await transactionalEntityManager.save(newCategory);

            // Add skills if provided
            if (categoryUpdate.skills && Array.isArray(categoryUpdate.skills)) {
              // Handle adding skills...
            }
          }
        }
      }

      // Handle custom labels updates if provided
      if (updates.customLabels && Array.isArray(updates.customLabels)) {
        // Update/add/remove custom labels logic...
      }

      // Return updated group template
      return this.getGroupTemplateDetails(groupTemplateId);
    });
  }

  // CATEGORY METHODS

  async addCategory(
    groupTemplateId: number,
    categoryName: string
  ): Promise<GroupTemplateCategory> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    groupTemplate.isCustomized = true;
    await this.groupTemplateRepository.save(groupTemplate);

    const newCategory = await this.groupTemplateCategoryRepository.create({
      name: categoryName,
      groupTemplate,
      isCustom: true,
    });
    return this.groupTemplateCategoryRepository.save(newCategory);
  }

  async updateCategory(
    groupTemplateId: number,
    categoryId: number,
    updates: any
  ): Promise<GroupTemplateCategory> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    if (updates.name) {
      category.name = updates.name;
      category.isCustom = true;
    }

    await this.groupTemplateCategoryRepository.save(category);
    return category;
  }

  async deleteCategory(
    groupTemplateId: number,
    categoryId: number
  ): Promise<void> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });
    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
      relations: ["skills", "skills.metrics"],
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // transaction to ensure all related entities are deleted

    this.dataSource.transaction(async (transactionalEntityManager) => {
      // Delete all related skills and metrics
      for (const skill of category.skills) {
        if (skill.metrics && skill.metrics.length > 0) {
          await transactionalEntityManager.remove(skill.metrics);
        }
      }

      if (category.skills && category.skills.length > 0) {
        await transactionalEntityManager.remove(category.skills);
      }

      // Delete the category itself
      await transactionalEntityManager.remove(category);
    });

    await this.groupTemplateCategoryRepository.remove(category);
  }

  // SKILL METHODS

  async addSkill(
    groupTemplateId: number,
    categoryId: number,
    skillName: string
  ): Promise<GroupTemplateSkill> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });
    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
      relations: ["skills"],
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const newSkill = await this.groupTemplateSkillRepository.create({
      name: skillName,
      category,
      isCustom: true,
    });
    return this.groupTemplateSkillRepository.save(newSkill);
  }

  async updateSkill(
    groupTemplateId: number,
    categoryId: number,
    skillId: number,
    updates: any
  ): Promise<GroupTemplateSkill> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });
    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, 
        groupTemplate: { id: groupTemplateId },
       },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const skill = await this.groupTemplateSkillRepository.findOne({
      where: { id: skillId, 
        category: { id: categoryId, groupTemplate: { id: groupTemplateId } },
       },
    });
    if (!skill) {
      throw new Error("Skill not found");
    }

    if (updates.name) {
      skill.name = updates.name;
      skill.isCustom = true;
    }

    await this.groupTemplateSkillRepository.save(skill);
    return skill;
  }

  async deleteSkill(
    groupTemplateId: number,
    categoryId: number,
    skillId: number
  ): Promise<void> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
    });
    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, 
        groupTemplate: { id: groupTemplateId },
       },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const skill = await this.groupTemplateSkillRepository.findOne({
      where: { id: skillId, 
        category: { id: categoryId, groupTemplate: { id: groupTemplateId } },
       },
      relations: ["metrics"],
    });
    if (!skill) {
      throw new Error("Skill not found");
    }

    // transaction to ensure all related metrics are deleted
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      if (skill.metrics && skill.metrics.length > 0) {
        await transactionalEntityManager.remove(skill.metrics);
      }
      await transactionalEntityManager.remove(skill);
    });
  }

  // METRIC METHODS

  async addMetric(
    groupTemplateId: number,
    categoryId: number,
    skillId: number,
    metricData: any
  ): Promise<GroupTemplateMetric> {
    const skill = await this.groupTemplateSkillRepository.findOne({
      where: {
        id: skillId,
        category: { id: categoryId, groupTemplate: { id: groupTemplateId } },
      },
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const exsistingMetric = await this.groupTemplateMetricRepository.findOne({
      where: { skill: { id: skillId } },
      order: { order: "DESC" },
    });

    const nextOrder = exsistingMetric ? exsistingMetric.order + 1 : 1;

    const newMetric = await this.groupTemplateMetricRepository.create({
      name: metricData.name,
      order: metricData.order || nextOrder,
      metric_type: metricData.metric_type,
      min_value: metricData.min_value,
      max_value: metricData.max_value,
      step: metricData.step,
      units: metricData.units,
      lower_score_is_better: metricData.lower_score_is_better || false,
      info: metricData.info,
      meta: metricData.meta,
      skill,
      isCustom: true,
    });

    return this.groupTemplateMetricRepository.save(newMetric);
  }

  async updateMetric(
    groupTemplateId: number,
    categoryId: number,
    skillId: number,
    metricId: number,
    updates: any
  ): Promise<GroupTemplateMetric> {
    const metric = await this.groupTemplateMetricRepository.findOne({
      where: {
        id: metricId,
        skill: {
          id: skillId,
          category: {
            id: categoryId,
            groupTemplate: { id: groupTemplateId },
          },
        },
      },
    });

    if (!metric) {
      throw new Error("Metric not found");
    }

    Object.assign(metric, {
      name: updates.name !== undefined ? updates.name : metric.name,
      order: updates.order !== undefined ? updates.order : metric.order,
      metric_type:
        updates.metric_type !== undefined
          ? updates.metric_type
          : metric.metric_type,
      min_value:
        updates.min_value !== undefined ? updates.min_value : metric.min_value,
      max_value:
        updates.max_value !== undefined ? updates.max_value : metric.max_value,
      step: updates.step !== undefined ? updates.step : metric.step,
      units: updates.units !== undefined ? updates.units : metric.units,
      lower_score_is_better:
        updates.lower_score_is_better !== undefined
          ? updates.lower_score_is_better
          : metric.lower_score_is_better,
      info: updates.info !== undefined ? updates.info : metric.info,
      meta: updates.meta !== undefined ? updates.meta : metric.meta,
      isCustom: true,
    });

    await this.groupTemplateMetricRepository.save(metric);
    return metric;
  }

  async deleteMetric(
    groupTemplateId: number,
    categoryId: number,
    skillId: number,
    metricId: number
  ): Promise<void> {
    const metric = await this.groupTemplateMetricRepository.findOne({
      where: {
        id: metricId,
        skill: {
          id: skillId,
          category: {
            id: categoryId,
            groupTemplate: { id: groupTemplateId },
          },
        },
      },
    });

    if (!metric) {
      throw new Error("Metric not found");
    }

    await this.groupTemplateMetricRepository.remove(metric);

    const remainingMetrics = await this.groupTemplateMetricRepository.find({
      where: {
        skill: { id: skillId },
      },
      order: { order: "ASC" },
    });

    if (remainingMetrics.length > 0) {
      for (let i = 0; i < remainingMetrics.length; i++) {
        remainingMetrics[i].order = i + 1;
      }

      await this.groupTemplateMetricRepository.save(remainingMetrics);
    }
  }
}
