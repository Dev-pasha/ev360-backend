import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { GroupTemplateController } from "../controllers/group.template.controller";

const router = Router();
const groupTemplateController = new GroupTemplateController();

/**
 * @route   POST /api/v1/group-templates/:groupId
 * @desc    Assign template to group
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    query("templateId").isInt().withMessage("Template ID must be an integer"),
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  groupTemplateController.AssignTemplateToGroup
);

/**
 * @route   GET /api/v1/group-templates/:groupId
 * @desc    Get assigned template for a group
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  groupTemplateController.GetAssignedTemplate
);

/**
 * @route   GET /api/v1/group-templates/:groupId/details
 * @desc    Get Group Template Details
 * @access  Private
 */
router.get(
  "/:groupId/details",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.GetGroupTemplateDetails
);

/**
 * @route   PUT /api/v1/group-templates/:groupTemplateId
 * @desc    Update Group Template
 * @access  Private
 */
router.put(
  "/:groupTemplateId",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.UpdateGroupTemplate
);


// get group template categories
/**
 * @route   GET /api/v1/group-templates/:groupId/categories
 * @desc    Get categories in group template
 * @access  Private
 */
router.get(
  "/:groupId/categories",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.GetCategoriesInGroupTemplate
);



/**
 * @route   POST /api/v1/group-templates/:groupId/categories
 * @desc    Add category to group template
 * @access  Private
 */
router.post(
  "/:groupId/categories",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    body("name").notEmpty().withMessage("Category name is required"),
  ],
  groupTemplateController.AddCategoryToGroupTemplate
);

/**
 * @route   PUT /api/v1/group-templates/:groupId/categories
 * @desc    Update category in group template
 * @access  Private
 */
router.put(
  "/:groupId/categories",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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
 * @route   DELETE /api/v1/group-templates/:groupId/categories
 * @desc    Delete category from group template
 * @access  Private
 */
router.delete(
  "/:groupId/categories",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
  ],
  groupTemplateController.DeleteCategoryFromGroupTemplate
);

/**
 * @route   GET /api/v1/group-templates/:groupId/categories/skills
 * @desc    Get skill to category in group template
 * @access  Private
 */

router.get(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
  ],
  groupTemplateController.GetSkillsInCategoryInGroupTemplate
);

/**
 * @route   POST /api/v1/group-templates/:groupId/categories/skills
 * @desc    Add skill to category in group template
 * @access  Private
 */
router.post(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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
 * @route   PUT /api/v1/group-templates/:groupId/categories/skills
 * @desc    Update skill in category in group template
 * @access  Private
 */
router.put(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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
 * @route   DELETE /api/v1/group-templates/:groupId/categories/skills
 * @desc    Delete skill from category in group template
 * @access  Private
 */
router.delete(
  "/:groupId/categories/skills",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
  ],
  groupTemplateController.DeleteSkillFromCategoryInGroupTemplate
);

/**
 * @route   GET /api/v1/group-templates/:groupId/categories/skills/metrics
 * @desc    Get metrics to skill in category in group template
 * @access  Private
 */

router.post(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
    query("categoryId").isInt().withMessage("Category ID must be an integer"),
    query("skillId").isInt().withMessage("Skill ID must be an integer"),
    // body("name").notEmpty().withMessage("Metric name is required"),
  ],
  groupTemplateController.getAllMetrics
);

/**
 * @route   POST /api/v1/group-templates/:groupId/categories/skills/metrics
 * @desc    Add metric to skill in category in group template
 * @access  Private
 */
router.post(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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
 * @route   PUT /api/v1/group-templates/:groupId/categories/skills/metrics
 * @desc    Update metric in skill in category in group template
 * @access  Private
 */
router.put(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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
 * @route   DELETE /api/v1/group-templates/:groupId/categories/skills/metrics
 * @desc    Delete metric from skill in category in group template
 * @access  Private
 */
router.delete(
  "/:groupId/categories/skills/metrics",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
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


// Get group template categories for an event via group id

router.get(
  "/:groupId/categories",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("groupTemplateId")
      .isInt()
      .withMessage("Group Template ID must be an integer"),
  ],
  groupTemplateController.GetGroupTemplateCategories
);



/**
 * @route   GET /api/v1/group-templates/:groupId/skills
 * @desc    Get all skills in a group template with comment counts
 * @access  Private
 */
router.get(
  "/:groupId/skills",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  groupTemplateController.GetGroupSkillsWithComments
);



/**
 * @route   GET /api/v1/group-templates/:groupId/:skillId/comments
 * @desc    Get comments for a skill in a group template
 * @access  Private
 */


router.get(
  "/:groupId/:skillId/comments",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("skillId").isInt().withMessage("Skill ID must be an integer"),
  ],
  groupTemplateController.GetSkillComments
);


/**
 * @route   POST /api/v1/group-templates/:groupId/:skillId/comments
 * @desc    Add comment to skill in group template
 * @access  Private
 */

router.post(
  "/:groupId/:skillId/comments",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("skillId").isInt().withMessage("Skill ID must be an integer"),
    body("comment").notEmpty().withMessage("Comment is required"),
    body("category").optional().isString().withMessage("Category must be a string"),
  ],
  groupTemplateController.CreateSkillComment
);


/**
 * @route   PUT /api/v1/group-templates/:groupId/:skillId/comments
 * @desc    Update comment in skill in group template
 * @access  Private
 */

router.put(
  "/:groupId/:skillId/comments/:commentId",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("skillId").isInt().withMessage("Skill ID must be an integer"),
    param("commentId").isInt().withMessage("Comment ID must be an integer"),
  ],
  groupTemplateController.UpdateSkillComment
);


/**
 * @route   DELETE /api/v1/group-templates/:groupId/:skillId/comments/:commentId
 * @desc    Delete comment from skill in group template
 * @access  Private
 */

router.delete(
  "/:groupId/:skillId/comments/:commentId",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("skillId").isInt().withMessage("Skill ID must be an integer"),
    param("commentId").isInt().withMessage("Comment ID must be an integer"),
  ],
  groupTemplateController.DeleteSkillComment
);

/**
 * @route   GET /api/v1/group-templates/:groupId/:skillId/comments/grouped
 * @desc    Get comments grouped by category for a skill in a group template
 * @access  Private
 */

router.get(
  "/:groupId/:skillId/comments/grouped",
  authMiddleware,
  [
    // requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("skillId").isInt().withMessage("Skill ID must be an integer"),
  ],
  groupTemplateController.GetCommentsGroupedByCategory
);



export default router;
