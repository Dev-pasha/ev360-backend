import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { MessageInput, MessageService, RecipientInput } from "../services/message.service";
import { errorResponse, successResponse } from "../utils/response";
import Logger from "../config/logger";
import { RecipientType } from "../entities/message.entity";
import { PlayerService } from "../services/player.service";
import { PlayerListService } from "../services/player-list.service";
import { UserService } from "../services/user.service";
import { GroupService } from "../services/group.service";


enum FrontendRecipientType {
  ALL_PLAYERS = "all-players",
  ALL_EVALUATORS = "all-evaluators",
  SPECIFIC_PLAYER_LISTS = "specific-player-lists",
}

interface FrontendMessageRequest {
  recipientType: string;
  subject: string;
  body: string;
  replyTo: string;
  playerListIds?: number[]; // Only for specific-player-lists
}

export class MessageController {
  private messageService: MessageService;
  private playerService: PlayerService;
  private userService: UserService;
  private playerListService: PlayerListService;
  private groupService: GroupService

  constructor() {
    this.messageService = new MessageService();
    this.playerService = new PlayerService();
    this.userService = new UserService();
    this.playerListService = new PlayerListService();
    this.groupService = new GroupService();
    
  }

  /**
   * Send a new message
   * POST /api/v1/messages/:groupId
   */
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const debugId = `MSG-${Date.now()}`;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        Logger.warn(`${debugId} Validation failed:`, errors.array());
        res.status(400).json(errorResponse('Validation failed', 400, errors.array()));
        return;
      }

      const { groupId } = req.params;
      const frontendRequest: FrontendMessageRequest = req.body;

      Logger.info(`${debugId} Message send request received`, {
        groupId,
        recipientType: frontendRequest.recipientType,
        playerListIds: frontendRequest.playerListIds,
        subject: frontendRequest.subject,
        replyToEmail: frontendRequest.replyTo
      });

      // Validate frontend recipient type
      if (!this.isValidFrontendRecipientType(frontendRequest.recipientType)) {
        Logger.warn(`${debugId} Invalid recipient type:`, frontendRequest.recipientType);
        res.status(400).json(
          errorResponse(
            `Invalid recipient type. Must be one of: ${Object.values(FrontendRecipientType).join(', ')}`,
            400
          )
        );
        return;
      }

      // Validate specific requirements
      if (frontendRequest.recipientType === FrontendRecipientType.SPECIFIC_PLAYER_LISTS) {
        if (!frontendRequest.playerListIds || frontendRequest.playerListIds.length === 0) {
          Logger.warn(`${debugId} Missing playerListIds for specific-player-lists`);
          res.status(400).json(
            errorResponse('playerListIds is required and must be a non-empty array for specific-player-lists', 400)
          );
          return;
        }
      }

      // Map frontend type to database enum
      const databaseRecipientType = this.mapFrontendToDatabase(frontendRequest.recipientType);
      Logger.debug(`${debugId} Mapped frontend type ${frontendRequest.recipientType} to database type ${databaseRecipientType}`);

      // Get recipients based on frontend type
      let recipients: RecipientInput[];
      try {
        recipients = await this.getRecipientsForFrontendType(
          parseInt(groupId),
          frontendRequest.recipientType,
          frontendRequest.playerListIds
        );
        Logger.info(`${debugId} Found ${recipients.length} recipients for type ${frontendRequest.recipientType}`);
      } catch (error) {
        Logger.error(`${debugId} Failed to get recipients:`, error);
        res.status(400).json(
          errorResponse('Failed to determine recipients', 400)
        );
        return;
      }

      if (recipients.length === 0) {
        Logger.warn(`${debugId} No recipients found`);
        res.status(400).json(
          errorResponse(`No recipients found for type: ${frontendRequest.recipientType}`, 400)
        );
        return;
      }

      // Get reply-to user ID
      let replyToId: number;
      try {
        replyToId = await this.getUserIdByEmail(frontendRequest.replyTo);
        Logger.debug(`${debugId} Found reply-to user ID: ${replyToId} for email: ${frontendRequest.replyTo}`);
      } catch (error) {
        Logger.error(`${debugId} Invalid reply-to email:`, error);
        res.status(400).json(
          errorResponse(`Invalid reply-to email: ${frontendRequest.replyTo}`, 400)
        );
        return;
      }

      // Create message data for service (using database types)
      const messageData: MessageInput = {
        subject: frontendRequest.subject,
        body: frontendRequest.body,
        recipient_type: databaseRecipientType, // Use mapped database enum
        recipients: recipients,
        reply_to_id: replyToId
      };

      Logger.info(`${debugId} Sending message with data:`, {
        groupId: parseInt(groupId),
        frontendType: frontendRequest.recipientType,
        databaseType: databaseRecipientType,
        recipientCount: recipients.length,
        replyToId
      });

      // Send the message
      const result = await this.messageService.sendMessage(
        parseInt(groupId),
        messageData
      );

      const duration = Date.now() - startTime;
      Logger.info(`${debugId} Message sent successfully in ${duration}ms`, {
        messageId: result.message.id,
        totalRecipients: result.totalRecipients,
        validRecipients: result.validRecipients
      });

      res.status(201).json(
        successResponse(result, 'Message sent successfully')
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`${debugId} Error sending message after ${duration}ms:`, {
  
        groupId: req.params.groupId,
        body: req.body
      });
      res.status(500).json(
        errorResponse(
          'Failed to send message',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Get all messages for a group
   * GET /api/v1/messages/:groupId
   */
  getGroupMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      const messages = await this.messageService.getGroupMessages(
        parseInt(groupId)
      );

      res.status(200).json(messages);
    } catch (error) {
      Logger.error("Error getting messages:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to get messages",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get a message by ID
   * GET /api/v1/messages/:groupId/:messageId
   */
  getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;

      const message = await this.messageService.getMessageById(
        parseInt(messageId)
      );

      res
        .status(200)
        .json(successResponse(message, "Message retrieved successfully"));
    } catch (error) {
      Logger.error("Error getting message:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }

      res
        .status(500)
        .json(
          errorResponse(
            "Failed to get message",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get message status
   * GET /api/v1/messages/:groupId/:messageId/status
   */
  getMessageStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;

      const status = await this.messageService.getMessageStatus(
        parseInt(messageId)
      );

      res
        .status(200)
        .json(successResponse(status, "Message status retrieved successfully"));
    } catch (error) {
      Logger.error("Error getting message status:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }

      res
        .status(500)
        .json(
          errorResponse(
            "Failed to get message status",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };


   private isValidFrontendRecipientType(type: string): boolean {
    return Object.values(FrontendRecipientType).includes(type as FrontendRecipientType);
  }

  /**
   * Map frontend recipient type to database enum
   */
  private mapFrontendToDatabase(frontendType: string): RecipientType {
    switch (frontendType) {
      case FrontendRecipientType.ALL_PLAYERS:
      case FrontendRecipientType.SPECIFIC_PLAYER_LISTS:
        return RecipientType.PLAYERS;
      case FrontendRecipientType.ALL_EVALUATORS:
        return RecipientType.EVALUATORS;
      default:
        throw new Error(`Unsupported frontend recipient type: ${frontendType}`);
    }
  }

  /**
   * Get recipients based on frontend type
   */
  private async getRecipientsForFrontendType(
    groupId: number,
    frontendType: string,
    playerListIds?: number[]
  ): Promise<any[]> {
    
    switch (frontendType) {
      case FrontendRecipientType.ALL_PLAYERS:
        return await this.getAllPlayersForGroup(groupId);
        
      case FrontendRecipientType.ALL_EVALUATORS:
        return await this.getAllEvaluatorsForGroup(groupId);
        
      case FrontendRecipientType.SPECIFIC_PLAYER_LISTS:
        if (!playerListIds || playerListIds.length === 0) {
          throw new Error('Player list IDs required for specific-player-lists');
        }
        return await this.getPlayersFromLists(groupId, playerListIds);
        
      default:
        throw new Error(`Unsupported frontend recipient type: ${frontendType}`);
    }
  }

  /**
   * Get all players for a group
   */
  private async getAllPlayersForGroup(groupId: number): Promise<any[]> {
    try {
      const players = await this.playerService.getPlayersByGroup(groupId);
      
      if (!players || players.length === 0) {
        throw new Error(`No players found for group ${groupId}`);
      }

      return players
        .filter(player => player.email) // Only include players with email
        .map(player => ({
          player_id: player.id,
          evaluator_id: null,
          email: player.email
        }));
    } catch (error) {
      Logger.error(`Error getting all players for group ${groupId}:`, error);
      throw new Error(`Failed to retrieve players for group ${groupId}: ${error}`);
    }
  }

  /**
   * Get all evaluators for a group
   */
  private async getAllEvaluatorsForGroup(groupId: number): Promise<any[]> {
    try {
      const evaluators = await this.groupService.getEvaluatorsByGroup(groupId);
      
      if (!evaluators || evaluators.length === 0) {
        throw new Error(`No evaluators found for group ${groupId}`);
      }

      return evaluators
        .filter(evaluator => evaluator.email) // Only include evaluators with email
        .map(evaluator => ({
          player_id: null,
          evaluator_id: evaluator.id,
          email: evaluator.email
        }));
    } catch (error) {
      Logger.error(`Error getting all evaluators for group ${groupId}:`, error);
      throw new Error(`Failed to retrieve evaluators for group ${groupId}: ${error}`);
    }
  }

  /**
   * Get players from specific player lists
   */
  private async getPlayersFromLists(groupId: number, playerListIds: number[]): Promise<any[]> {
    try {
      Logger.debug(`Getting players from lists ${playerListIds.join(', ')} for group ${groupId}`);
      
      // Validate that the player lists belong to the group
      const validPlayerLists = await this.playerListService.validatePlayerListsForGroup(groupId, playerListIds);
      
      if (validPlayerLists.length !== playerListIds.length) {
        const validIds = validPlayerLists.map(list => list.id);
        const invalidIds = playerListIds.filter(id => !validIds.includes(id));
        throw new Error(`Invalid player list IDs for group ${groupId}: ${invalidIds.join(', ')}`);
      }

      // Get all players from the specified lists
      const players = await this.playerListService.getPlayersFromLists(playerListIds);
      
      if (!players || players.length === 0) {
        throw new Error(`No players found in the specified player lists: ${playerListIds.join(', ')}`);
      }

      // Remove duplicates and filter out players without email
      const uniquePlayers = this.removeDuplicatePlayersByEmail(players)
        .filter(player => player.email);
      
      Logger.info(`Found ${uniquePlayers.length} unique players with email from ${playerListIds.length} player lists`);

      return uniquePlayers.map(player => ({
        player_id: player.id,
        evaluator_id: null,
        email: player.email
      }));
    } catch (error) {
      Logger.error(`Error getting players from lists ${playerListIds.join(', ')}:`, error);
      throw new Error(`Failed to retrieve players from specified lists: ${error}`);
    }
  }

  /**
   * Remove duplicate players by email
   */
  private removeDuplicatePlayersByEmail(players: any[]): any[] {
    const seen = new Set<string>();
    return players.filter(player => {
      if (seen.has(player.email)) {
        return false;
      }
      seen.add(player.email);
      return true;
    });
  }

  /**
   * Get user ID by email address
   */
  private async getUserIdByEmail(email: string): Promise<number> {
    Logger.debug(`Looking up user ID for email: ${email}`);
    
    try {
      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        throw new Error(`User not found with email: ${email}`);
      }
      return user.id;
    } catch (error) {
      Logger.error(`Error getting user ID for email ${email}:`, error);
      throw error;
    }
  }


  
}
