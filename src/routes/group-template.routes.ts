import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { GroupTemplateController } from "../controllers/group.template.controller";

const router = Router();
const groupTemplateController = new GroupTemplateController();

/**
 * @route   POST /api/v1/group-template/:groupId
 *  @desc    Assign template to group
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    query("templateId").isInt().withMessage("Template ID must be an integer"),
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  groupTemplateController.AssignTemplateToGroup
);

/**
 * @route   GET /api/v1/group-template/:groupId
 * @desc    Get assigned template for a group
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  groupTemplateController.GetAssignedTemplate
);

/**
 * @route   GET /api/v1/group-template/template/:groupId
 * @desc    Get Group Template Details
 * @access  Private
 */

router.get(
  "/:groupId/details",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.GetGroupTemplateDetails
);

/**
 * @route   PUT /api/v1/group-template/:groupTemplateId
 * @desc    Update Group Template
 * @access  Private
 */

router.put(
  "/:groupTemplateId",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.UpdateGroupTemplate
);

// CATEGORY ADD
// POST /group-templates/:id/categories
// PUT /group-templates/:id/categories/:categoryId
// DELETE /group-templates/:id/categories/:categoryId

/**
 * @route   POST /api/v1/group-templates/:id/categories
 * @desc    Add category to group template
 * @access  Private
 */

router.post(
  "/:groupId/categories",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    body("name").notEmpty().withMessage("Category name is required"),
  ],
  groupTemplateController.AddCategoryToGroupTemplate
);

/**
 * @route   PUT /api/v1/group-templates/:id/categories
 * @desc    Update category in group template
 * @access  Private
 */

router.put(
  "/:groupId/categories",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    // body("name").notEmpty().withMessage("Category name is required"),
  ],
  groupTemplateController.UpdateCategoryInGroupTemplate
);

/**
 * @route   DELETE /api/v1/group-templates/:id/categories
 * @desc    Delete category from group template
 * @access  Private
 */

router.delete(
  "/:groupId/categories",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
  ],
  groupTemplateController.DeleteCategoryFromGroupTemplate
);

// Skills
// POST /group-templates/:id/categories/:categoryId/skills
// PUT /group-templates/:id/categories/:categoryId/skills/:skillId
// DELETE /group-templates/:id/categories/:categoryId/skills/:skillId

/**
 * @route   POST /api/v1/group-templates/:id/categories/:categoryId/skills
 * @desc    Add skill to category in group template
 * @access  Private
 */

router.post(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    // body("name").notEmpty().withMessage("Skill name is required"),
  ],
  groupTemplateController.AddSkillToCategoryInGroupTemplate
);

/**
 * @route   PUT /api/v1/group-templates/:id/categories/skills
 * @desc    Update skill in category in group template
 * @access  Private
 */

router.put(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
    body("name").notEmpty().withMessage("Skill name is required"),
  ],
  groupTemplateController.UpdateSkillInCategoryInGroupTemplate
);

/**
 * @route   DELETE /api/v1/group-templates/:id/categories/:categoryId/skills/:skillId
 * @desc    Delete skill from category in group template
 * @access  Private
 */

router.delete(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
  ],
  groupTemplateController.DeleteSkillFromCategoryInGroupTemplate
);

// Metrics
// POST /group-templates/:id/categories/:categoryId/skills/:skillId/metrics
// PUT /group-templates/:id/categories/:categoryId/skills/:skillId/metrics/:metricId
// DELETE /group-templates/:id/categories/:categoryId/skills/:skillId/metrics/:metricId

/**
 * @route   POST /api/v1/group-templates/:id/categories/skills/metrics
 * @desc    Add metric to skill in category in group template
 * @access  Private
 */

router.post(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
    // body("name").notEmpty().withMessage("Metric name is required"),
  ],
  groupTemplateController.AddMetricToSkillInCategoryInGroupTemplate
);

/**
 * @route   PUT /api/v1/group-templates/:id/categories/:categoryId/skills/:skillId/metrics/:metricId
 * @desc    Update metric in skill in category in group template
 * @access  Private
 */

router.put(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
    query("metricId").isInt().withMessage("Metric ID must be an integer"),
  ],
  groupTemplateController.UpdateMetricInSkillInCategoryInGroupTemplate
);

/**
 * @route   DELETE /api/v1/group-templates/:id/categories/:categoryId/skills/:skillId/metrics/:metricId
 * @desc    Delete metric from skill in category in group template
 * @access  Private
 */

router.delete(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
    query("metricId").isInt().withMessage("Metric ID must be an integer"),
  ],
  groupTemplateController.DeleteMetricFromSkillInCategoryInGroupTemplate
);

export default router;
