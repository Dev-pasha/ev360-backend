import { GroupTemplateService } from "../services/group-template.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

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
}
