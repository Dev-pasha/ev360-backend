import { GroupTemplateService } from "../services/group-template.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";
import { GroupTemplateSkillComment } from "../entities/group-template-skill-comment.entity";

export class GroupTemplateController {
  private groupTemplateService: GroupTemplateService;

  constructor() {
    this.groupTemplateService = new GroupTemplateService();
  }

  AssignTemplateToGroup = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Template assignment failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      //   console.log("req.params", req);
      const { groupId } = req.params;
      const { templateId } = req.query;

      // Assign template to group
      const groupTemplate =
        await this.groupTemplateService.assignTemplateToGroup(
          parseInt(groupId),
          parseInt(templateId as string)
        );

      res.status(200).json(
        successResponse({
          message: "Template assigned to group successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in assigning template to group: ", error);
      res
        .status(400)
        .json(errorResponse("Template assignment failed", 400, error));
    }
  };

  GetAssignedTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupId } = req.params;

      // Get assigned template for group
      const groupTemplate = await this.groupTemplateService.getGroupTemplates(
        parseInt(groupId)
      );

      res.status(200).json(
        successResponse({
          message: "Assigned template retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving assigned template: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving assigned template failed", 400, error));
    }
  };

  GetGroupTemplateDetails = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }
      const { groupTemplateId } = req.query;

      // Get group template details
      const groupTemplate =
        await this.groupTemplateService.getGroupTemplateDetails(
          parseInt(groupTemplateId as string)
        );

      res.status(200).json(
        successResponse({
          message: "Group template details retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving group template details: ", error);
      res
        .status(400)
        .json(
          errorResponse("Retrieving group template details failed", 400, error)
        );
    }
  };

  UpdateGroupTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Group template update failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId } = req.query;

      // Update group template
      const groupTemplate = await this.groupTemplateService.updateGroupTemplate(
        parseInt(groupTemplateId as string),
        req.body
      );

      res.status(200).json(
        successResponse({
          message: "Group template updated successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in updating group template: ", error);
      res
        .status(400)
        .json(errorResponse("Group template update failed", 400, error));
    }
  };

  //   CATEGORY CONTROLLER


  GetCategoriesInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId } = req.query;

      // Get categories in group template
      const groupTemplate =
        await this.groupTemplateService.getCategoriesInGroupTemplate(
          parseInt(groupTemplateId as string)
        );

      res.status(200).json(
        successResponse({
          message: "Categories retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving categories: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving categories failed", 400, error));
    }
  }

  AddCategoryToGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Category addition failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId } = req.query;
      const { groupId } = req.params;

      // Add category to group template
      const groupTemplate = await this.groupTemplateService.addCategory(
        parseInt(groupTemplateId as string),
        req.body.name,
        +groupId
      );

      res.status(200).json(
        successResponse({
          message: "Category added to group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in adding category to group template: ", error);
      res
        .status(400)
        .json(errorResponse("Category addition failed", 400, error));
    }
  };

  UpdateCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Category update failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId } = req.query;

      console.log(
        "groupTemplateId, categoryId, req.body",
        groupTemplateId,
        categoryId,
        req.body
      );

      // Update category in group template
      const groupTemplate = await this.groupTemplateService.updateCategory(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        req.body.name
      );
      res.status(200).json(
        successResponse({
          message: "Category updated in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in updating category in group template: ", error);
      res.status(400).json(errorResponse("Category update failed", 400, error));
    }
  };

  DeleteCategoryFromGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Category deletion failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId } = req.query;

      // Delete category from group template
      const groupTemplate = await this.groupTemplateService.deleteCategory(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Category deleted from group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in deleting category from group template: ", error);
      res
        .status(400)
        .json(errorResponse("Category deletion failed", 400, error));
    }
  };

  //   SKILLS CONTROLLER

  GetSkillsInCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId } = req.query;

      // Get skills in category in group template
      const groupTemplate = await this.groupTemplateService.getSkillsInCategory(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Skills in category retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving skills in category: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving skills failed", 400, error));
    }
  };

  AddSkillToCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Skill addition failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId } = req.query;

      // Add skill to category in group template
      const groupTemplate = await this.groupTemplateService.addSkill(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        req.body.name
      );

      console.log("groupTemplate", groupTemplate);

      res.status(200).json(
        successResponse({
          message: "Skill added to category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in adding skill to category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Skill addition failed", 400, error));
    }
  };

  UpdateSkillInCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Skill update failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId } = req.query;

      // Update skill in category in group template
      const groupTemplate = await this.groupTemplateService.updateSkill(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string),
        req.body.name
      );

      res.status(200).json(
        successResponse({
          message: "Skill updated in category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in updating skill in category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Skill update failed", 400, error));
    }
  };

  DeleteSkillFromCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Skill deletion failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId } = req.query;

      // Delete skill from category in group template
      const groupTemplate = await this.groupTemplateService.deleteSkill(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Skill deleted from category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in deleting skill from category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Skill deletion failed", 400, error));
    }
  };

  //   METRIC CONTROLLER

  getAllMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId } = req.query;

      // Get all metrics for skill in category in group template
      const groupTemplate = await this.groupTemplateService.getMetrics(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Metrics retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving metrics: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving metrics failed", 400, error));
    }
  };

  AddMetricToSkillInCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Metric addition failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId } = req.query;

      // Add metric to skill in category in group template
      const groupTemplate = await this.groupTemplateService.addMetric(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string),
        req.body
      );

      res.status(200).json(
        successResponse({
          message:
            "Metric added to skill in category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in adding metric to skill in category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Metric addition failed", 400, error));
    }
  };

  UpdateMetricInSkillInCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Metric update failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId, metricId } = req.query;

      // Update metric in skill in category in group template
      const groupTemplate = await this.groupTemplateService.updateMetric(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string),
        parseInt(metricId as string),
        req.body
      );

      res.status(200).json(
        successResponse({
          message:
            "Metric updated in skill in category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in updating metric in skill in category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Metric update failed", 400, error));
    }
  };

  DeleteMetricFromSkillInCategoryInGroupTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Metric deletion failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId, categoryId, skillId, metricId } = req.query;

      // Delete metric from skill in category in group template
      const groupTemplate = await this.groupTemplateService.deleteMetric(
        parseInt(groupTemplateId as string),
        parseInt(categoryId as string),
        parseInt(skillId as string),
        parseInt(metricId as string)
      );

      res.status(200).json(
        successResponse({
          message:
            "Metric deleted from skill in category in group template successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error(
        "Error in deleting metric from skill in category in group template: ",
        error
      );
      res.status(400).json(errorResponse("Metric deletion failed", 400, error));
    }
  };

  GetGroupTemplateCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupTemplateId } = req.query;

      // Get categories in group template
      const groupTemplate =
        await this.groupTemplateService.getGroupTemplateCategories(
          parseInt(groupTemplateId as string)
        );

      res.status(200).json(
        successResponse({
          message: "Categories retrieved successfully",
          groupTemplate,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving categories: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving categories failed", 400, error));
    }
  };

  // Get all comments for a skill

  GetSkillComments = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { skillId } = req.params;

      // Get all comments for a skill
      const comments = await this.groupTemplateService.getSkillComments(
        parseInt(skillId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Comments retrieved successfully",
          comments,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving skill comments: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving skill comments failed", 400, error));
    }
  };

  // Get comments grouped by category
  GetCommentsGroupedByCategory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { skillId } = req.params;

      // Get comments grouped by category
      const comments = await this.groupTemplateService.getSkillCommentsGrouped(
        parseInt(skillId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Comments grouped by category retrieved successfully",
          comments,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving comments grouped by category: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving comments failed", 400, error));
    }
  };

  // Create new comment for skill

  CreateSkillComment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Comment creation failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { skillId } = req.params;

      // Create new comment for skill
      const comment = await this.groupTemplateService.createSkillComment(
        parseInt(skillId as string),
        req.body as GroupTemplateSkillComment
      );

      res.status(201).json(
        successResponse({
          message: "Comment created successfully",
          comment,
        })
      );
    } catch (error) {
      Logger.error("Error in creating skill comment: ", error);
      res
        .status(400)
        .json(errorResponse("Comment creation failed", 400, error));
    }
  };

  // Delete comment (soft delete)
  DeleteSkillComment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Comment deletion failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { skillId, groupId, commentId } = req.params;

      // Delete comment (soft delete)
      const result = await this.groupTemplateService.deleteSkillComment(
        parseInt(commentId as string)
      );

      res.status(200).json(
        successResponse({
          message: "Comment deleted successfully",
          result,
        })
      );
    } catch (error) {
      Logger.error("Error in deleting skill comment: ", error);
      res
        .status(400)
        .json(errorResponse("Comment deletion failed", 400, error));
    }
  };

  // Update comment
  UpdateSkillComment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Comment update failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { commentId } = req.params;

      console.log("req.body", req.body);
      console.log("commentId", commentId);
      // Validate that commentId is provided
      if (!commentId) {
        res.status(400).json(errorResponse("Comment ID is required", 400));
        return;
      }

      // Update comment
      const result = await this.groupTemplateService.updateSkillComment(
        parseInt(commentId as string),
        req.body as GroupTemplateSkillComment
      );

      res.status(200).json(
        successResponse({
          message: "Comment updated successfully",
          result,
        })
      );
    } catch (error) {
      Logger.error("Error in updating skill comment: ", error);
      res.status(400).json(errorResponse("Comment update failed", 400, error));
    }
  };

  GetGroupSkillsWithComments = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { groupId } = req.params;

      // Get all skills with comments in group template
      const skillsWithComments =
        await this.groupTemplateService.getGroupSkillsWithComments(
          parseInt(groupId as string)
        );

      res.status(200).json(
        successResponse({
          message: "Skills with comments retrieved successfully",
          skillsWithComments,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving skills with comments: ", error);
      res
        .status(400)
        .json(errorResponse("Retrieving skills failed", 400, error));
    }
  };

  addEvaluationNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Add evaluation note failed", 400, errors));
        return;
      }

      const { eventId, evaluationId } = req.params;
      const { note } = req.body;
      const evaluatorId = req.user?.id; // Assuming user ID is available in request

      const result = await this.groupTemplateService.addEvaluationNote(
        +eventId,
        +evaluationId,
        Number(evaluatorId),
        note
      );

      res.status(200).json(
        successResponse({
          message: "Note added successfully",
          evaluation: result,
        })
      );
    } catch (error) {
      Logger.error("Error adding evaluation note: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to add evaluation note", 400, error));
    }
  };

  updateEvaluationNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Update evaluation note failed", 400, errors));
        return;
      }

      const { eventId, evaluationId } = req.params;
      const { note } = req.body;
      const evaluatorId = req.user?.id;

      const result = await this.groupTemplateService.updateEvaluationNote(
        +eventId,
        +evaluationId,
        Number(evaluatorId),
        note
      );

      res.status(200).json(
        successResponse({
          message: "Note updated successfully",
          evaluation: result,
        })
      );
    } catch (error) {
      Logger.error("Error updating evaluation note: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to update evaluation note", 400, error));
    }
  };

  deleteEvaluationNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Delete evaluation note failed", 400, errors));
        return;
      }

      const { eventId, metricId } = req.params;
      const evaluatorId = req.user?.id;

      const result = await this.groupTemplateService.deleteEvaluationNote(
        +eventId,
        +metricId,
        Number(evaluatorId)
      );

      res.status(200).json(
        successResponse({
          message: "Note deleted successfully",
          evaluation: result,
        })
      );
    } catch (error) {
      Logger.error("Error deleting evaluation note: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to delete evaluation note", 400, error));
    }
  };

  getEvaluationNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get evaluation note failed", 400, errors));
        return;
      }

      const { eventId, evaluationId } = req.params;
      const evaluatorId = req.user?.id;

      const result = await this.groupTemplateService.getEvaluationNote(
        +eventId,
        +evaluationId,
        Number(evaluatorId)
      );

      res.status(200).json(
        successResponse({
          note: result.note,
          evaluation: result,
        })
      );
    } catch (error) {
      Logger.error("Error getting evaluation note: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to get evaluation note", 400, error));
    }
  };
}
