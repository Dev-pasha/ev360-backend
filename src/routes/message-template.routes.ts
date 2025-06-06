import { RequestHandler, Router } from 'express';
import { body, param } from 'express-validator';
import { MessageTemplateController } from '../controllers/message-template.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const messageTemplateController = new MessageTemplateController();

/**
 * @route   POST /api/v1/message-templates/:groupId
 * @desc    Create a new message template
 * @access  Private
 */
router.post(
  '/:groupId',
  authMiddleware,
  // requirePermission('manage_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    body('name')
      .notEmpty()
      .isString()
      .withMessage('Template name is required'),
    body('subject')
      .notEmpty()
      .isString()
      .withMessage('Subject is required'),
    body('body')
      .notEmpty()
      .isString()
      .withMessage('Body is required'),
  ],
  messageTemplateController.createMessageTemplate
);

/**
 * @route   GET /api/v1/message-templates/:groupId
 * @desc    Get all message templates for a group
 * @access  Private
 */
router.get(
  '/:groupId',
  authMiddleware,
  // requirePermission('view_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
  ],
  messageTemplateController.getGroupMessageTemplates
);

/**
 * @route   GET /api/v1/message-templates/:groupId/:templateId
 * @desc    Get a message template by ID
 * @access  Private
 */
router.get(
  '/:groupId/:templateId',
  authMiddleware,
  // requirePermission('view_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    param('templateId')
      .notEmpty()
      .isInt()
      .withMessage('Template ID must be an integer'),
  ],
  messageTemplateController.getMessageTemplate
);

/**
 * @route   PUT /api/v1/message-templates/:groupId/:templateId
 * @desc    Update a message template
 * @access  Private
 */
router.put(
  '/:groupId/:templateId',
  authMiddleware,
  // requirePermission('manage_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    param('templateId')
      .notEmpty()
      .isInt()
      .withMessage('Template ID must be an integer'),
    body('name')
      .optional()
      .isString()
      .withMessage('Template name must be a string'),
    body('subject')
      .optional()
      .isString()
      .withMessage('Subject must be a string'),
    body('body')
      .optional()
      .isString()
      .withMessage('Body must be a string'),
  ],
  messageTemplateController.updateMessageTemplate
);

/**
 * @route   DELETE /api/v1/message-templates/:groupId/:templateId
 * @desc    Delete a message template
 * @access  Private
 */
router.delete(
  '/:groupId/:templateId',
  authMiddleware,
  // requirePermission('manage_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    param('templateId')
      .notEmpty()
      .isInt()
      .withMessage('Template ID must be an integer'),
  ],
  messageTemplateController.deleteMessageTemplate
);

export default router;