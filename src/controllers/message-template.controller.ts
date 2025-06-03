import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { MessageTemplateService } from '../services/message-template.service';
import { errorResponse, successResponse } from '../utils/response';
import Logger from "../config/logger";

export class MessageTemplateController {
  private messageTemplateService: MessageTemplateService;

  constructor() {
    this.messageTemplateService = new MessageTemplateService();
  }

  /**
   * Create a new message template
   * POST /api/v1/message-templates/:groupId
   */
  createMessageTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse('Validation failed', 400, errors.array()));
        return;
      }

      const { groupId } = req.params;
      const templateData = req.body;

      const template = await this.messageTemplateService.createMessageTemplate(
        parseInt(groupId),
        templateData
      );

      res.status(201).json(
        successResponse(template, 'Message template created successfully')
      );
    } catch (error) {
      Logger.error('Error creating message template:', error);
      res.status(500).json(
        errorResponse(
          'Failed to create message template',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Get all message templates for a group
   * GET /api/v1/message-templates/:groupId
   */
  getGroupMessageTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      const templates = await this.messageTemplateService.getGroupMessageTemplates(
        parseInt(groupId)
      );

      res.status(200).json(templates);
    } catch (error) {
      Logger.error('Error getting message templates:', error);
      res.status(500).json(
        errorResponse(
          'Failed to get message templates',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Get a message template by ID
   * GET /api/v1/message-templates/:groupId/:templateId
   */
  getMessageTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;

      const template = await this.messageTemplateService.getMessageTemplateById(
        parseInt(templateId)
      );

      res.status(200).json(
        successResponse(template, 'Message template retrieved successfully')
      );
    } catch (error) {
      Logger.error('Error getting message template:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }
      
      res.status(500).json(
        errorResponse(
          'Failed to get message template',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Update a message template
   * PUT /api/v1/message-templates/:groupId/:templateId
   */
  updateMessageTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse('Validation failed', 400, errors.array()));
        return;
      }

      const { templateId } = req.params;
      const templateData = req.body;

      const template = await this.messageTemplateService.updateMessageTemplate(
        parseInt(templateId),
        templateData
      );

      res.status(200).json(
        successResponse(template, 'Message template updated successfully')
      );
    } catch (error) {
      Logger.error('Error updating message template:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }
      
      res.status(500).json(
        errorResponse(
          'Failed to update message template',
                500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Delete a message template
   * DELETE /api/v1/message-templates/:groupId/:templateId
   */
  deleteMessageTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;

      const deleted = await this.messageTemplateService.deleteMessageTemplate(
        parseInt(templateId)
      );

      if (deleted) {
        res.status(200).json(
          successResponse(null, 'Message template deleted successfully')
        );
      } else {
        res.status(404).json(
          errorResponse('Message template not found', 404)
        );
      }
    } catch (error) {
      Logger.error('Error deleting message template:', error);
      res.status(500).json(
        errorResponse(
          'Failed to delete message template',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };
}