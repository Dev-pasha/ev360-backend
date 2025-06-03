import { RequestHandler, Router } from 'express';
import { body, param } from 'express-validator';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const messageController = new MessageController();

/**
 * @route   POST /api/v1/messages/:groupId
 * @desc    Send a new message
 * @access  Private
 */
router.post(
  '/:groupId',
  authMiddleware,
  requirePermission('send_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    body('subject')
      .notEmpty()
      .isString()
      .withMessage('Subject is required'),
    body('body')
      .notEmpty()
      .isString()
      .withMessage('Body is required'),
  ],
  messageController.sendMessage
);

/**
 * @route   GET /api/v1/messages/:groupId
 * @desc    Get all messages for a group
 * @access  Private
 */
router.get(
  '/:groupId',
  authMiddleware,
  requirePermission('view_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
  ],
  messageController.getGroupMessages
);

/**
 * @route   GET /api/v1/messages/:groupId/:messageId
 * @desc    Get a message by ID
 * @access  Private
 */
router.get(
  '/:groupId/:messageId',
  authMiddleware,
  requirePermission('view_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    param('messageId')
      .notEmpty()
      .isInt()
      .withMessage('Message ID must be an integer'),
  ],
  messageController.getMessage
);

/**
 * @route   GET /api/v1/messages/:groupId/:messageId/status
 * @desc    Get message status
 * @access  Private
 */
router.get(
  '/:groupId/:messageId/status',
  authMiddleware,
  requirePermission('view_messages') as RequestHandler,
  [
    param('groupId')
      .notEmpty()
      .isInt()
      .withMessage('Group ID must be an integer'),
    param('messageId')
      .notEmpty()
      .isInt()
      .withMessage('Message ID must be an integer'),
  ],
  messageController.getMessageStatus
);


// getRecipientsWithCount

/**
 * @route   GET /api/v1/messages/:groupId/message/recipients/count
 * @desc    Get recipients with status counts for a message
 * @access  Private
 */



export default router;