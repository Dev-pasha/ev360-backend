// src/routes/event.routes.ts
import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { EventController } from "../controllers/event.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { EventType } from "../entities/event.entity";
import { EvaluatorStatus } from "../entities/event-evaluator.entity";
import { GroupTemplateController } from "../controllers/group.template.controller";

const router = Router();
const eventController = new EventController();
const groupTemplateController = new GroupTemplateController();


/**
 * @route   POST /api/v1/events/:groupId
 * @desc    Create a new event
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  // requirePermission("create_events") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("name")
      .notEmpty()
      .isString()
      .trim()
      .withMessage("Event name is required"),
    body("event_type")
      .optional()
      .isIn([EventType.STANDARD_EVALUATION, EventType.SELF_ASSESSMENT])
      .withMessage("Invalid event type"),
    body("event_datetime")
      .notEmpty()
      .isISO8601()
      .withMessage("Valid event start date is required"),
    body("end_date")
      .notEmpty()
      .isISO8601()
      .withMessage("Valid event end date is required"),
    body("skill_ids")
      .notEmpty()
      .isArray()
      .withMessage("Skill IDs must be an array"),
    body("skill_ids.*").isInt().withMessage("Each skill ID must be an integer"),
    body("player_ids")
      .notEmpty()
      .isArray()
      .withMessage("Player IDs must be an array"),
    body("player_ids.*")
      .isInt()
      .withMessage("Each player ID must be an integer"),
    body("evaluator_ids")
      .notEmpty()
      .isArray()
      .withMessage("Evaluator IDs must be an array"),
    body("evaluator_ids.*")
      .isInt()
      .withMessage("Each evaluator ID must be an integer"),
  ],
  eventController.createEvent
);

/**
 * @route   PUT /api/v1/events/:groupId/:eventId
 * @desc    Update an event
 * @access  Private
 */
router.put(
  "/:groupId/:eventId",
  authMiddleware,
  // requirePermission("update_events") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("name")
      .optional()
      .isString()
      .trim()
      .withMessage("Event name must be a string"),
    body("event_datetime")
      .optional()
      .isISO8601()
      .withMessage("Valid event start date is required"),
    body("end_date")
      .optional()
      .isISO8601()
      .withMessage("Valid event end date is required"),
    body("hide_player_names")
      .optional()
      .isBoolean()
      .withMessage("Hide player names must be a boolean"),
    body("hide_preferred_positions")
      .optional()
      .isBoolean()
      .withMessage("Hide preferred positions must be a boolean"),
    body("locked")
      .optional()
      .isBoolean()
      .withMessage("Locked must be a boolean"),
  ],
  eventController.updateEvent
);

router.get(
  "/:groupId/all",
  authMiddleware,
  // requirePermission("view_events") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  eventController.getAllEvents
);

/**
 * @route   GET /api/v1/events/:groupId/:eventId
 * @desc    Get event by ID
 * @access  Private
 */

router.get(
  "/:groupId/:eventId",
  authMiddleware,
  //   requirePermission("view_events") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  eventController.getEvent
);

/**
 * @route   GET /api/v1/events/group/:groupId
 * @desc    Get events for a group
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  // requirePermission("view_events") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    // query("active")
    //   .optional()
    //   .isBoolean()
    //   .withMessage("Active must be a boolean"),
    // query("event_type")
    //   .optional()
    //   .isIn([EventType.STANDARD_EVALUATION, EventType.SELF_ASSESSMENT])
    //   .withMessage("Invalid event type"),
    // query("team_id")
    //   .optional()
    //   .isInt()
    //   .withMessage("Team ID must be an integer"),
    // query("start_date")
    //   .optional()
    //   .isISO8601()
    //   .withMessage("Invalid start date"),
    // query("end_date").optional().isISO8601().withMessage("Invalid end date"),
  ],
  eventController.getGroupEvents
);

/**
 * @route   PUT /api/v1/events/:groupId/:eventId/check-in
 * @desc    Check in a player for an event
 * @access  Private
 */

router.put(
  "/:groupId/:eventId/check-in/players",
  authMiddleware,
  // requirePermission("check_in_players") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("playerId")
      .custom((value) => {
        // Normalize to array for easier validation
        const ids = Array.isArray(value) ? value : [value];

        if (ids.length === 0) {
          throw new Error("At least one player ID is required");
        }

        if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
          throw new Error("All player IDs must be positive integers");
        }

        return true;
      })
      .withMessage(
        "Player ID must be a positive integer or array of positive integers"
      ),
  ],
  eventController.checkInPlayer
);

/**
 * @route   POST /api/v1/events/:eventId/players
 * @desc    Add players to event
 * @access  Private
 */
router.post(
  "/:eventId/players",
  authMiddleware,
  // requirePermission("update_events") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("playerIds")
      .notEmpty()
      .isArray()
      .withMessage("Player IDs must be an array"),
    body("playerIds.*")
      .isInt()
      .withMessage("Each player ID must be an integer"),
  ],
  eventController.addPlayers
);

/**
 * @route   DELETE /api/v1/events/:eventId/players
 * @desc    Remove players from event
 * @access  Private
 */
router.delete(
  "/:eventId/players",
  authMiddleware,
  // requirePermission("update_events") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("playerIds")
      .notEmpty()
      .isArray()
      .withMessage("Player IDs must be an array"),
    body("playerIds.*")
      .isInt()
      .withMessage("Each player ID must be an integer"),
  ],
  eventController.removePlayers
);

/**
 * @route   POST /api/v1/events/:eventId/evaluators
 * @desc    Invite evaluator to event
 * @access  Private
 */
router.post(
  "/:eventId/evaluators",
  authMiddleware,
  // requirePermission("manage_evaluators") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("evaluatorId")
      .notEmpty()
      .isInt()
      .withMessage("Evaluator ID must be an integer"),
  ],
  eventController.inviteEvaluator
);

/**
 * @route   PUT /api/v1/events/:eventId/evaluators/status
 * @desc    Update evaluator status
 * @access  Private
 */
router.put(
  "/:eventId/evaluators/status",
  authMiddleware,
  // requirePermission("manage_evaluators") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("evaluatorId")
      .notEmpty()
      .isInt()
      .withMessage("Evaluator ID must be an integer"),
    body("status")
      .notEmpty()
      .isIn(Object.values(EvaluatorStatus))
      .withMessage("Invalid evaluator status"),
  ],
  eventController.updateEvaluatorStatus
);

/**
 * @route   POST /api/v1/events/:eventId/groupId/evaluate
 * @desc    Submit evaluation
 * @access  Private
 */
router.post(
  "/:eventId/:groupId/evaluate",
  authMiddleware,
  // requirePermission("submit_evaluations") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("evaluations")
      .notEmpty()
      .isArray()
      .withMessage("Evaluations must be an array"),
    body("evaluations.*.playerId")
      .isInt()
      .withMessage("Player ID must be an integer"),
    body("evaluations.*.metricId")
      .isInt()
      .withMessage("Metric ID must be an integer"),
    body("evaluations.*.score")
      .optional()
      .isNumeric()
      .withMessage("Score must be a number"),
    body("evaluations.*.attempt_number")
      .optional()
      .isInt()
      .withMessage("Attempt number must be an integer"),
  ],
  eventController.submitEvaluation
);

/**
 * @route   GET /api/v1/events/:eventId/:groupId/results
 * @desc    Get event results
 * @access  Private
 */
router.get(
  "/:eventId/:groupId/results",
  authMiddleware,
  // requirePermission("view_evaluations") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    query("playerId")
      .optional()
      .isInt()
      .withMessage("Player ID must be an integer"),
    query("evaluatorId")
      .optional()
      .isInt()
      .withMessage("Evaluator ID must be an integer"),
    query("skillId")
      .optional()
      .isInt()
      .withMessage("Skill ID must be an integer"),
  ],
  eventController.getEventResults
);

/**
 * @route   DELETE /api/v1/events/:eventId
 * @desc    Delete event
 * @access  Private
 */
router.delete(
  "/:eventId",
  authMiddleware,
  // requirePermission("delete_events") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  eventController.deleteEvent
);

/**
 * @route   PUT /api/v1/events/:groupId/:eventId/lock
 * @desc    Lock/unlock event
 * @access  Private
 */
router.put(
  "/:groupId/:eventId/lock",
  authMiddleware,
  // requirePermission("manage_events") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    body("locked")
      .notEmpty()
      .isBoolean()
      .withMessage("Locked must be a boolean"),
  ],
  eventController.setEventLocked
);

/**
 * @route   GET /api/v1/events/:eventId/progress
 * @desc    Get evaluator progress
 * @access  Private
 */
router.get(
  "/:eventId/progress",
  authMiddleware,
  // requirePermission("view_evaluations") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  eventController.getEvaluatorProgress
);

/**
 * @route   GET /api/v1/events/:eventId/sync-evaluators
 * @desc    Sync event evaluators
 * @access  Private
 */

router.get(
  "/:eventId/sync-evaluators",
  authMiddleware,
  // requirePermission("manage_evaluators") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  eventController.syncEventEvaluators
);

/**
 * @route   GET /api/v1/events/:eventId/sync-skills
 * @desc    Sync event skills
 * @access  Private
 */

router.get(
  "/:eventId/sync-skills",
  authMiddleware,
  // requirePermission("manage_skills") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  eventController.syncEventSkills
);

/**
 * @route   POST /api/v1/events/:eventId/evaluations/:evaluationId/notes
 * @desc    Add note to evaluation result
 * @access  Private
 */
router.post(
  "/:eventId/evaluations/:evaluationId/notes",
  authMiddleware,
  // requirePermission("submit_evaluations") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    param("evaluationId")
      .notEmpty()
      .isInt()
      .withMessage("Evaluation ID must be an integer"),
    body("note")
      .notEmpty()
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Note must be a string between 1 and 1000 characters"),
  ],
  groupTemplateController.addEvaluationNote
);

/**
 * @route   PUT /api/v1/events/:eventId/evaluations/:evaluationId/notes
 * @desc    Update note in evaluation result
 * @access  Private
 */
router.put(
  "/:eventId/evaluations/:evaluationId/notes",
  authMiddleware,
  // requirePermission("submit_evaluations") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    param("evaluationId")
      .notEmpty()
      .isInt()
      .withMessage("Evaluation ID must be an integer"),
    body("note")
      .notEmpty()
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Note must be a string between 1 and 1000 characters"),
  ],
  groupTemplateController.updateEvaluationNote
);

/**
 * @route   DELETE /api/v1/events/:eventId/evaluations/:evaluationId/notes
 * @desc    Delete note from evaluation result
 * @access  Private
 */
router.delete(
  "/:eventId/evaluations/:evaluationId/notes",
  authMiddleware,
  // requirePermission("submit_evaluations") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    param('metricId')
      .notEmpty()
      .isInt()
      .withMessage("Metric ID must be an integer"),
  ],
  groupTemplateController.deleteEvaluationNote
);

/**
 * @route   GET /api/v1/events/:eventId/evaluations/:evaluationId/notes
 * @desc    Get note from evaluation result
 * @access  Private
 */
router.get(
  "/:eventId/evaluations/:evaluationId/notes",
  authMiddleware,
  // requirePermission("view_evaluations") as RequestHandler,
  [
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
    param("evaluationId")
      .notEmpty()
      .isInt()
      .withMessage("Evaluation ID must be an integer"),
  ],
  groupTemplateController.getEvaluationNote
);

export default router;
