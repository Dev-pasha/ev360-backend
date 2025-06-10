import AppDataSource from "../config/database";
import { EvaluationTemplate } from "../entities/evaluation-template.entity";
import { GroupTemplateCategory } from "../entities/group-template-category.entity";
import { GroupTemplateCustomLabel } from "../entities/group-template-custom-lable.entity";
import { GroupTemplateMetric } from "../entities/group-template-metric-score.entity";
import { GroupTemplateSkill } from "../entities/group-template-skill.entity";
import { GroupTemplate } from "../entities/group-template.entity";
import { Group } from "../entities/group.entity";
import { DataSource, In } from "typeorm";
import { CategoryService } from "./category.service";
import { GroupTemplateSkillComment } from "../entities/group-template-skill-comment.entity";
import { EvaluationResult } from "../entities/evaluation-result.entity";
import Logger from "../config/logger";

export class GroupTemplateService {
  private groupRepository;
  private evaluationRepository;
  private groupTemplateRepository;
  private groupTemplateCategoryRepository;
  private groupTemplateSkillRepository;
  private groupTemplateMetricRepository;
  private readonly categoryService: CategoryService;
  private skillCommentRepository;
  private skillRepository;
  private metricRepository;
  private evaluationResultRepository;

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
    this.categoryService = new CategoryService(this.dataSource);
    this.skillCommentRepository = this.dataSource.getRepository(
      GroupTemplateSkillComment
    );
    this.skillRepository = this.dataSource.getRepository(GroupTemplateSkill);
    this.metricRepository = this.dataSource.getRepository(GroupTemplateMetric);
    this.evaluationResultRepository = this.dataSource.getRepository(EvaluationResult);
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

      for (const category of template.categories) {
        await this.categoryService.createCategory(groupId, {
          name: category.name,
        });
      }

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


  async getCategoriesInGroupTemplate(
    groupTemplateId: number
  ): Promise<GroupTemplateCategory[]> {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { id: groupTemplateId },
      relations: ["categories", "categories.skills", "categories.skills.metrics"],
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    return groupTemplate.categories;
  }


  async addCategory(
    groupTemplateId: number,
    categoryName: string,
    groupId?: number
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

    if (groupId === undefined) {
      throw new Error("Group ID is required to create a category");
    }

    await this.categoryService.createCategory(groupId, {
      name: categoryName,
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

    try {
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Step 1: Find all skills IDs for this category
        const skills = await transactionalEntityManager.find(
          GroupTemplateSkill,
          {
            where: { category: { id: categoryId } },
            select: ["id"],
          }
        );

        const skillIds = skills.map((skill) => skill.id);

        if (skillIds.length > 0) {
          // Step 2: Delete metrics for these skills
          await transactionalEntityManager.delete(GroupTemplateMetric, {
            skill: { id: In(skillIds) },
          });

          // Step 3: Delete the skills themselves
          await transactionalEntityManager.delete(GroupTemplateSkill, {
            id: In(skillIds),
          });
        }

        // Step 4: Delete the category
        await transactionalEntityManager.delete(GroupTemplateCategory, {
          id: categoryId,
        });

        await this.categoryService.deleteCategory(category.id, {
          name: category.name,
        });
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete category: ${error.message}`);
      } else {
        throw new Error("Failed to delete category due to an unknown error");
      }
    }
  }
  // SKILL METHODS

  async getSkillsInCategory(
    groupTemplateId: number,
    categoryId: number
  ): Promise<GroupTemplateSkill[]> {
    const category = await this.groupTemplateCategoryRepository.findOne({
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
      relations: ["skills"],
    });

    if (!category) {
      throw new Error("Category not found");
    }

    return category.skills;
  }

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
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const skill = await this.groupTemplateSkillRepository.findOne({
      where: {
        id: skillId,
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
      where: { id: categoryId, groupTemplate: { id: groupTemplateId } },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const skill = await this.groupTemplateSkillRepository.findOne({
      where: {
        id: skillId,
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

  async getMetrics(
    groupTemplateId: number,
    categoryId: number,
    skillId: number
  ): Promise<GroupTemplateMetric[]> {
    const skill = await this.groupTemplateSkillRepository.findOne({
      where: {
        id: skillId,
        category: { id: categoryId, groupTemplate: { id: groupTemplateId } },
      },
      relations: ["metrics"],
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    return skill.metrics;
  }

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

  async getGroupTemplateCategories(
    groupTemplateId: number
  ): Promise<GroupTemplateCategory[]> {
    const groupTemplate = await this.groupTemplateRepository.find({
      where: { id: groupTemplateId },
      relations: [
        "categories",
        "categories.skills",
        "categories.skills.metrics",
      ],
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    return groupTemplate.map((template) => template.categories).flat();
  }

  async createSkillComment(
    skillId: number,
    commentData: {
      comment: string;
      category?: string;
      order?: number;
    }
  ) {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
      relations: ["category"],
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const skillComment = this.skillCommentRepository.create({
      skill,
      comment: commentData.comment,
      category: commentData.category || "neutral",
      order: commentData.order || 0,
    });

    const savedComment = await this.skillCommentRepository.save(skillComment);

    return {
      comment: savedComment,
      skill: {
        id: skill.id,
        name: skill.name,
        categoryName: skill.category?.name || "Uncategorized",
      },
    };
  }

  async getSkillComments(skillId: number) {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
      relations: ["category", "prefilledComments"],
      order: { prefilledComments: { order: "ASC" } },
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const activeComments = skill.prefilledComments.filter(
      (comment) => comment.isActive
    );

    return {
      skill: {
        id: skill.id,
        name: skill.name,
        categoryName: skill.category?.name || "Uncategorized",
      },
      comments: activeComments,
    };
  }

  // Get comments for a skill by metric ID (optimized)
  async getCommentsByMetricId(metricId: number) {
    const metric = await this.metricRepository.findOne({
      where: { id: metricId },
      relations: ["skill", "skill.category", "skill.prefilledComments"],
    });

    if (!metric || !metric.skill) {
      throw new Error("Metric not found or has no associated skill");
    }

    const activeComments = metric.skill.prefilledComments.filter(
      (comment) => comment.isActive
    );

    return {
      skill: {
        id: metric.skill.id,
        name: metric.skill.name,
        categoryName: metric.skill.category?.name || "Uncategorized",
      },
      comments: activeComments,
    };
  }

  // Update comment
  async updateSkillComment(
    commentId: number,
    updateData: {
      comment?: string;
      category?: string;
      order?: number;
      isActive?: boolean;
    }
  ) {
    const comment = await this.skillCommentRepository.findOne({
      where: { id: commentId },
      relations: ["skill", "skill.category"],
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    Object.assign(comment, updateData);
    const updatedComment = await this.skillCommentRepository.save(comment);

    return {
      comment: updatedComment,
      skill: {
        id: comment.skill.id,
        name: comment.skill.name,
        categoryName: comment.skill.category?.name || "Uncategorized",
      },
    };
  }

  // Delete comment (soft delete by setting isActive = false)
  async deleteSkillComment(commentId: number) {
    const result = await this.updateSkillComment(commentId, {
      isActive: false,
    });
    return { success: true, message: "Comment deleted successfully" };
  }

  async createBulkSkillComments(
    skillId: number,
    comments: Array<{
      comment: string;
      category?: string;
      order?: number;
    }>
  ) {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
      relations: ["category"],
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const skillComments = comments.map((commentData, index) =>
      this.skillCommentRepository.create({
        skill,
        comment: commentData.comment,
        category: commentData.category || "neutral",
        order: commentData.order !== undefined ? commentData.order : index,
      })
    );

    const savedComments = await this.skillCommentRepository.save(skillComments);

    return {
      skill: {
        id: skill.id,
        name: skill.name,
        categoryName: skill.category?.name || "Uncategorized",
      },
      comments: savedComments,
    };
  }

  // Get comments grouped by category with skill info
  async getSkillCommentsGrouped(skillId: number) {
    const result = await this.getSkillComments(skillId);

    const groupedComments = result.comments.reduce(
      (grouped, comment) => {
        const category = comment.category || "neutral";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(comment);
        return grouped;
      },
      {} as Record<string, typeof result.comments>
    );

    // Ensure all categories exist even if empty
    const allCategories = ["positive", "negative", "improvement", "neutral"];
    allCategories.forEach((category) => {
      if (!groupedComments[category]) {
        groupedComments[category] = [];
      }
    });

    return {
      skill: result.skill,
      commentsByCategory: groupedComments,
    };
  }

  // Get comments grouped by category for metric
  async getCommentsGroupedByMetricId(metricId: number) {
    const result = await this.getCommentsByMetricId(metricId);

    const groupedComments = result.comments.reduce(
      (grouped, comment) => {
        const category = comment.category || "neutral";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(comment);
        return grouped;
      },
      {} as Record<string, typeof result.comments>
    );

    // Ensure all categories exist even if empty
    const allCategories = ["positive", "negative", "improvement", "neutral"];
    allCategories.forEach((category) => {
      if (!groupedComments[category]) {
        groupedComments[category] = [];
      }
    });

    return {
      skill: result.skill,
      commentsByCategory: groupedComments,
    };
  }

  // Get all skills in a group with comment counts (for management UI)
  async getGroupSkillsWithComments(groupId: number) {
    const groupTemplate = await this.groupTemplateRepository.findOne({
      where: { group: { id: groupId } },
      relations: [
        "group",
        "categories",
        "categories.skills",
        "categories.skills.prefilledComments",
      ],
    });

    if (!groupTemplate) {
      throw new Error("Group template not found");
    }

    const categoriesWithSkills = groupTemplate.categories.map((category) => ({
      id: category.id,
      name: category.name,
      skills: category.skills.map((skill) => {
        const activeComments = skill.prefilledComments.filter(
          (comment) => comment.isActive
        );

        // Count comments by category
        const commentsByCategory = activeComments.reduce(
          (counts, comment) => {
            const cat = comment.category || "neutral";
            counts[cat] = (counts[cat] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>
        );

        // Ensure all categories exist
        ["positive", "negative", "improvement", "neutral"].forEach((cat) => {
          if (!commentsByCategory[cat]) commentsByCategory[cat] = 0;
        });

        return {
          id: skill.id,
          name: skill.name,
          isCustom: skill.isCustom,
          commentCount: activeComments.length,
          commentsByCategory,
        };
      }),
    }));

    return {
      group: {
        id: groupTemplate.group.id,
        name: groupTemplate.group.name,
      },
      categories: categoriesWithSkills,
    };
  }

  async addEvaluationNote(
    eventId: number,
    evaluationId: number,
    evaluatorId: number,
    note: string
  ): Promise<EvaluationResult> {
    try {
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Find the evaluation result
        const evaluation = await transactionalEntityManager.findOne(
          EvaluationResult,
          {
            where: {
              id: evaluationId,
              event: { id: eventId },
              evaluator: { id: evaluatorId },
            },
            relations: ["event", "player", "evaluator", "metric"],
          }
        );

        if (!evaluation) {
          throw new Error("Evaluation result not found or access denied");
        }

        // Check if note already exists
        if (evaluation.note && evaluation.note.trim() !== "") {
          throw new Error(
            "Note already exists. Use update endpoint to modify it."
          );
        }

        // Add the note
        evaluation.note = note;
        evaluation.updated_at = new Date();

        const savedEvaluation =
          await transactionalEntityManager.save(evaluation);
        return savedEvaluation;
      });
    } catch (error) {
      Logger.error("Error adding evaluation note:", error);
      throw error;
    }
  }

  async updateEvaluationNote(
    eventId: number,
    evaluationId: number,
    evaluatorId: number,
    note: string
  ): Promise<EvaluationResult> {
    try {
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Find the evaluation result
        const evaluation = await transactionalEntityManager.findOne(
          EvaluationResult,
          {
            where: {
              id: evaluationId,
              event: { id: eventId },
              evaluator: { id: evaluatorId },
            },
            relations: ["event", "player", "evaluator", "metric"],
          }
        );

        if (!evaluation) {
          throw new Error("Evaluation result not found or access denied");
        }

        // Check if note exists
        if (!evaluation.note || evaluation.note.trim() === "") {
          throw new Error(
            "No note exists to update. Use add endpoint to create a note."
          );
        }

        // Update the note
        evaluation.note = note;
        evaluation.updated_at = new Date();

        const savedEvaluation =
          await transactionalEntityManager.save(evaluation);
        return savedEvaluation;
      });
    } catch (error) {
      Logger.error("Error updating evaluation note:", error);
      throw error;
    }
  }

  async deleteEvaluationNote(
    eventId: number,
    evaluationId: number,
    evaluatorId: number
  ): Promise<EvaluationResult> {
    try {
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Find the evaluation result
        const evaluation = await transactionalEntityManager.findOne(
          EvaluationResult,
          {
            where: {
              id: evaluationId,
              event: { id: eventId },
              evaluator: { id: evaluatorId },
            },
            relations: ["event", "player", "evaluator", "metric"],
          }
        );

        if (!evaluation) {
          throw new Error("Evaluation result not found or access denied");
        }

        // Check if note exists
        if (!evaluation.note || evaluation.note.trim() === "") {
          throw new Error("No note exists to delete");
        }

        // Delete the note
        evaluation.note = '';
        evaluation.updated_at = new Date();

        const savedEvaluation =
          await transactionalEntityManager.save(evaluation);
        return savedEvaluation;
      });
    } catch (error) {
      Logger.error("Error deleting evaluation note:", error);
      throw error;
    }
  }

  async getEvaluationNote(
    eventId: number,
    evaluationId: number,
    evaluatorId: number
  ): Promise<EvaluationResult> {
    try {
      const evaluation = await this.evaluationResultRepository.findOne({
        where: {
          id: evaluationId,
          event: { id: eventId },
          evaluator: { id: evaluatorId },
        },
        relations: ["event", "player", "evaluator", "metric"],
      });

      if (!evaluation) {
        throw new Error("Evaluation result not found or access denied");
      }

      return evaluation;
    } catch (error) {
      Logger.error("Error getting evaluation note:", error);
      throw error;
    }
  }
}
