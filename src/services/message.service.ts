import { DataSource, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Message, RecipientType } from "../entities/message.entity";
import {
  MessageRecipient,
  MessageStatus,
} from "../entities/message-recipient.entity";
import Logger from "../config/logger";
import { EmailService } from "./email.service";
import { PlayerService } from "./player.service";
import { Player } from "../entities/player.entity";
import { UserService } from "./user.service";
import { User } from "../entities/user.entity";

export interface RecipientInput {
  player_id?: number | null;
  evaluator_id?: number | null;
  email: string;
}

export interface MessageInput {
  subject: string;
  body: string;
  recipient_type: RecipientType;
  recipients: RecipientInput[];
  reply_to_id: number;
}

export interface MessageSendResult {
  message: Message;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: string[];
}

export class MessageService {
  private messageRepository: Repository<Message>;
  private recipientRepository: Repository<MessageRecipient>;
  private emailService: EmailService;
  private userRepository: Repository<User>;
  private playerRepository: Repository<Player>;
  private readonly DEBUG_PREFIX = "[MessageService]";

  constructor(private dataSource: DataSource = AppDataSource) {
    this.messageRepository = this.dataSource.getRepository(Message);
    this.recipientRepository = this.dataSource.getRepository(MessageRecipient);
    this.emailService = new EmailService();
    this.userRepository = this.dataSource.getRepository(User);
    this.playerRepository = this.dataSource.getRepository(Player);
  }

  /**
   * Send a new message to multiple recipients with comprehensive validation and debugging
   */
  async sendMessage(
    groupId: number,
    messageData: MessageInput
  ): Promise<MessageSendResult> {
    const startTime = Date.now();
    const debugId = `MSG-${Date.now()}`;

    console.log("messageData", messageData);

    Logger.info(
      `${this.DEBUG_PREFIX} [${debugId}] Starting message send process`,
      {
        groupId,
        recipientCount: messageData.recipients.length,
        recipientType: messageData.recipient_type,
        subject: messageData.subject,
      }
    );

    try {
      // Validate input data
      this.validateMessageInput(messageData, debugId);

      // Validate recipients
      const recipientValidation = this.validateRecipients(
        messageData.recipients,
        debugId
      );

      // Create message
      Logger.debug(`${this.DEBUG_PREFIX} [${debugId}] Creating message entity`);
      const message = this.messageRepository.create({
        subject: messageData.subject,
        body: messageData.body,
        recipient_type: messageData.recipient_type,
        reply_to_id: messageData.reply_to_id,
        group_id: groupId,
        sent_date: new Date(),
      });

      // Save message to get ID
      Logger.debug(
        `${this.DEBUG_PREFIX} [${debugId}] Saving message to database`
      );
      const savedMessage = await this.messageRepository.save(message);
      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Message saved with ID: ${savedMessage.id}`
      );

      // Create recipients (only valid ones)
      const validRecipients = recipientValidation.validRecipients;
      Logger.debug(
        `${this.DEBUG_PREFIX} [${debugId}] Creating ${validRecipients.length} recipient entities`
      );

      const recipients = validRecipients.map((r, index) => {
        Logger.debug(
          `${this.DEBUG_PREFIX} [${debugId}] Creating recipient ${index + 1}`,
          {
            email: r.email,
            playerId: r.player_id,
            evaluatorId: r.evaluator_id,
          }
        );

        return this.recipientRepository.create({
          message_id: savedMessage.id,
          player_id: r.player_id || null,
          evaluator_id: r.evaluator_id || null,
          email: r.email,
          status: MessageStatus.PENDING,
        });
      });

      Logger.debug(
        `${this.DEBUG_PREFIX} [${debugId}] Saving ${recipients.length} recipients to database`
      );
      await this.recipientRepository.save(recipients);
      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Recipients saved successfully`
      );

      // Log invalid recipients if any
      if (recipientValidation.invalidRecipients.length > 0) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] Skipped ${recipientValidation.invalidRecipients.length} invalid recipients`,
          {
            invalidEmails: recipientValidation.invalidRecipients,
          }
        );
      }

      // Send emails asynchronously with delay to ensure DB commit
      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Starting async email processing`
      );

      setTimeout(() => {
        this.processMessageQueue(savedMessage.id, groupId, debugId).catch(
          (error) => {
            Logger.error(
              `${this.DEBUG_PREFIX} [${debugId}] Error in async email processing:`,
              error
            );
          }
        );
      }, 300); // 300ms delay to ensure database commit

      // Return message with recipients
      const finalMessage = await this.getMessageById(savedMessage.id);
      const duration = Date.now() - startTime;

      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Message send process completed`,
        {
          messageId: savedMessage.id,
          duration: `${duration}ms`,
          totalRecipients: messageData.recipients.length,
          validRecipients: validRecipients.length,
          invalidRecipients: recipientValidation.invalidRecipients.length,
        }
      );

      return {
        message: finalMessage,
        totalRecipients: messageData.recipients.length,
        validRecipients: validRecipients.length,
        invalidRecipients: recipientValidation.invalidRecipients,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(
        `${this.DEBUG_PREFIX} [${debugId}] Error in sendMessage after ${duration}ms:`,
        {
          groupId,
          messageData: {
            subject: messageData.subject,
            recipientCount: messageData.recipients.length,
            recipientType: messageData.recipient_type,
          },
        }
      );
      throw error;
    }
  }

  /**
   * Validate message input data
   */
  private validateMessageInput(
    messageData: MessageInput,
    debugId: string
  ): void {
    Logger.debug(`${this.DEBUG_PREFIX} [${debugId}] Validating message input`);

    if (!messageData.subject?.trim()) {
      throw new Error("Message subject is required");
    }

    if (!messageData.body?.trim()) {
      throw new Error("Message body is required");
    }

    if (!messageData.recipients || messageData.recipients.length === 0) {
      throw new Error("At least one recipient is required");
    }

    if (!Object.values(RecipientType).includes(messageData.recipient_type)) {
      throw new Error(`Invalid recipient type: ${messageData.recipient_type}`);
    }

    Logger.debug(
      `${this.DEBUG_PREFIX} [${debugId}] Message input validation passed`
    );
  }

  /**
   * Validate recipients and separate valid from invalid
   */
  private validateRecipients(
    recipients: RecipientInput[],
    debugId: string
  ): {
    validRecipients: RecipientInput[];
    invalidRecipients: string[];
  } {
    Logger.debug(
      `${this.DEBUG_PREFIX} [${debugId}] Validating ${recipients.length} recipients`
    );

    const validRecipients: RecipientInput[] = [];
    const invalidRecipients: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    recipients.forEach((recipient, index) => {
      const recipientDebug = `recipient-${index + 1}`;
      Logger.debug(
        `${this.DEBUG_PREFIX} [${debugId}] Validating ${recipientDebug}`,
        {
          email: recipient.email,
          playerId: recipient.player_id,
          evaluatorId: recipient.evaluator_id,
        }
      );

      // Check email format
      if (!recipient.email || !emailRegex.test(recipient.email)) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] ${recipientDebug} has invalid email: ${recipient.email}`
        );
        invalidRecipients.push(recipient.email || "empty-email");
        return;
      }

      // Check that exactly one of player_id or evaluator_id is set
      const hasPlayerId =
        recipient.player_id !== null && recipient.player_id !== undefined;
      const hasEvaluatorId =
        recipient.evaluator_id !== null && recipient.evaluator_id !== undefined;

      if (!hasPlayerId && !hasEvaluatorId) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] ${recipientDebug} missing both player_id and evaluator_id`
        );
        invalidRecipients.push(recipient.email);
        return;
      }

      if (hasPlayerId && hasEvaluatorId) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] ${recipientDebug} has both player_id and evaluator_id set`
        );
        invalidRecipients.push(recipient.email);
        return;
      }

      validRecipients.push(recipient);
      Logger.debug(
        `${this.DEBUG_PREFIX} [${debugId}] ${recipientDebug} validation passed`
      );
    });

    Logger.info(
      `${this.DEBUG_PREFIX} [${debugId}] Recipient validation complete`,
      {
        total: recipients.length,
        valid: validRecipients.length,
        invalid: invalidRecipients.length,
      }
    );

    return { validRecipients, invalidRecipients };
  }

  /**
   * Process message queue (send emails to recipients) with enhanced debugging
   */
  private async processMessageQueue(
    messageId: number,
    groupId?: number,
    parentDebugId?: string
  ): Promise<void> {
    const debugId = parentDebugId
      ? `${parentDebugId}-QUEUE`
      : `QUEUE-${messageId}`;
    const startTime = Date.now();

    Logger.info(
      `${this.DEBUG_PREFIX} [${debugId}] Starting email queue processing for message ${messageId}`
    );

    try {
      // Add small delay to ensure message is fully committed
      await new Promise((resolve) => setTimeout(resolve, 50));

      const message = await this.getMessageById(messageId);
      const recipientCount = message.recipients?.length || 0;

      if (recipientCount === 0) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] No recipients found for message ${messageId}`
        );
        return;
      }

      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Processing ${recipientCount} recipients with variable processing`
      );

      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (const recipient of message.recipients) {
        const recipientDebugId = `${debugId}-R${recipient.id}`;
        processedCount++;

        Logger.debug(
          `${this.DEBUG_PREFIX} [${recipientDebugId}] Processing recipient ${processedCount}/${recipientCount}`,
          {
            email: recipient.email,
            playerId: recipient.player_id,
            evaluatorId: recipient.evaluator_id,
            currentStatus: recipient.status,
          }
        );

        try {
          // Update status to processing
          Logger.debug(
            `${this.DEBUG_PREFIX} [${recipientDebugId}] Updating status to PROCESSING`
          );
          recipient.status = MessageStatus.PROCESSING;
          recipient.last_updated_date = new Date();
          await this.recipientRepository.save(recipient);

          // Get recipient name data for variable processing
          let firstName = "";
          let lastName = "";

          try {
            if (recipient.player_id) {
              // Get player data
              Logger.debug(
                `${this.DEBUG_PREFIX} [${recipientDebugId}] Fetching player data for ID: ${recipient.player_id}`
              );
            

              const player = await this.playerRepository.findOne({
                where: { id: recipient.player_id, group: { id: groupId } },
                select: ["id", "first_name", "last_name", "email"],
              });

              console.log("player", player);

              if (player) {
                firstName = player.first_name || player.first_name || "";
                lastName = player.last_name || player.last_name || "";
                Logger.debug(
                  `${this.DEBUG_PREFIX} [${recipientDebugId}] Player data found:`,
                  {
                    firstName: firstName || "[empty]",
                    lastName: lastName || "[empty]",
                  }
                );
              } else {
                Logger.warn(
                  `${this.DEBUG_PREFIX} [${recipientDebugId}] Player not found for ID: ${recipient.player_id}`
                );
              }
            } else if (recipient.evaluator_id) {
              // Get evaluator data
              Logger.debug(
                `${this.DEBUG_PREFIX} [${recipientDebugId}] Fetching evaluator data for ID: ${recipient.evaluator_id}`
              );

              const evaluator = await this.userRepository.findOne({
                where: { id: recipient.evaluator_id },
              });


              if (evaluator) {
                firstName = evaluator.firstName || "";
                lastName = evaluator.lastName || "";
                Logger.debug(
                  `${this.DEBUG_PREFIX} [${recipientDebugId}] Evaluator data found:`,
                  {
                    firstName: firstName || "[empty]",
                    lastName: lastName || "[empty]",
                  }
                );
              } else {
                Logger.warn(
                  `${this.DEBUG_PREFIX} [${recipientDebugId}] Evaluator not found for ID: ${recipient.evaluator_id}`
                );
              }
            }
          } catch (dataError) {
            Logger.warn(
              `${this.DEBUG_PREFIX} [${recipientDebugId}] Failed to fetch recipient data:`,
              dataError
            );
            // Continue with empty names - variables will remain unchanged
          }

          // Process variables in subject and body
          const originalSubject = message.subject;
          const originalBody = message.body;

          const processedSubject = MessageService.processBasicVariables(
            originalSubject,
            firstName,
            lastName
          );

          const processedBody = MessageService.processBasicVariables(
            originalBody,
            firstName,
            lastName
          );

          // Log variable processing results

          this.logVariableProcessing(
            originalSubject,
            originalBody,
            processedSubject,
            processedBody,
            firstName,
            lastName,
            recipientDebugId
          );

          // Send email with processed content
          Logger.debug(
            `${this.DEBUG_PREFIX} [${recipientDebugId}] Sending email with processed variables`
          );
          const emailStart = Date.now();

          await this.emailService.sendEmail({
            to: recipient.email,
            subject: processedSubject,
            html: processedBody,
            replyTo: message.reply_to?.email,
            from: process.env.DEFAULT_FROM_EMAIL || "noreply@example.com",
          });

          const emailDuration = Date.now() - emailStart;
          Logger.info(
            `${this.DEBUG_PREFIX} [${recipientDebugId}] Email sent successfully in ${emailDuration}ms`
          );

          // Update status to sent
          recipient.status = MessageStatus.SENT;
          recipient.last_updated_date = new Date();
          await this.recipientRepository.save(recipient);

          successCount++;
          Logger.debug(
            `${this.DEBUG_PREFIX} [${recipientDebugId}] Status updated to SENT`
          );
        } catch (error) {
          failureCount++;
          Logger.error(
            `${this.DEBUG_PREFIX} [${recipientDebugId}] Failed to send email:`,
            {
              email: recipient.email,
            }
          );

          // Update status to failed
          try {
            recipient.status = MessageStatus.FAILED;
            recipient.last_updated_date = new Date();
            await this.recipientRepository.save(recipient);
            Logger.debug(
              `${this.DEBUG_PREFIX} [${recipientDebugId}] Status updated to FAILED`
            );
          } catch (updateError) {
            Logger.error(
              `${this.DEBUG_PREFIX} [${recipientDebugId}] Failed to update status to FAILED:`,
              updateError
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Email queue processing completed`,
        {
          messageId,
          duration: `${duration}ms`,
          totalRecipients: recipientCount,
          successful: successCount,
          failed: failureCount,
          successRate: `${((successCount / recipientCount) * 100).toFixed(1)}%`,
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(
        `${this.DEBUG_PREFIX} [${debugId}] Error in processMessageQueue after ${duration}ms:`,
        {
          messageId,
        }
      );

      // Don't throw error here to prevent crashing the main process
      Logger.error(
        `${this.DEBUG_PREFIX} [${debugId}] Email queue processing failed, but continuing...`
      );
    }
  }

  /**
   * Get message by ID with retry logic
   */
  async getMessageById(id: number, retryCount: number = 0): Promise<Message> {
    const maxRetries = 3;
    const retryDelay = 100; // 100ms delay between retries

    Logger.debug(
      `${this.DEBUG_PREFIX} Fetching message by ID: ${id} (attempt ${retryCount + 1})`
    );

    try {
      const message = await this.messageRepository.findOne({
        where: { id },
        relations: ["recipients", "reply_to", "group"],
      });

      if (!message) {
        // If message not found and we haven't exhausted retries, try again
        if (retryCount < maxRetries) {
          Logger.warn(
            `${this.DEBUG_PREFIX} Message ${id} not found, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return this.getMessageById(id, retryCount + 1);
        }

        Logger.error(
          `${this.DEBUG_PREFIX} Message not found with ID: ${id} after ${maxRetries} attempts`
        );
        throw new Error(`Message with ID ${id} not found`);
      }

      Logger.debug(`${this.DEBUG_PREFIX} Message fetched successfully`, {
        id: message.id,
        subject: message.subject,
        recipientCount: message.recipients?.length || 0,
        groupId: message.group_id,
      });

      return message;
    } catch (error) {
      if (error) {
        throw error; // Re-throw not found errors
      }

      Logger.error(
        `${this.DEBUG_PREFIX} Error getting message with ID ${id}:`,
        {
          attempt: retryCount + 1,
        }
      );
      throw error;
    }
  }

  /**
   * Get all messages for a group with debug logging
   */
  async getGroupMessages(groupId: number, limit?: number): Promise<Message[]> {
    Logger.debug(
      `${this.DEBUG_PREFIX} Fetching messages for group: ${groupId}`,
      { limit }
    );

    try {
      const queryOptions: any = {
        where: { group_id: groupId },
        relations: ["recipients"],
        order: { sent_date: "DESC" },
      };

      if (limit) {
        queryOptions.take = limit;
      }

      const messages = await this.messageRepository.find(queryOptions);

      Logger.info(
        `${this.DEBUG_PREFIX} Retrieved ${messages.length} messages for group ${groupId}`
      );

      return messages;
    } catch (error) {
      Logger.error(
        `${this.DEBUG_PREFIX} Error getting messages for group ${groupId}:`,
        {
          limit,
        }
      );
      throw error;
    }
  }

  /**
   * Get message status with enhanced details and debug logging
   */
  async getMessageStatus(messageId: number): Promise<{
    messageId: number;
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    successRate: number;
    lastUpdated: Date | null;
  }> {
    Logger.debug(
      `${this.DEBUG_PREFIX} Getting status for message: ${messageId}`
    );

    try {
      const recipients = await this.recipientRepository.find({
        where: { message_id: messageId },
        order: { last_updated_date: "DESC" },
      });

      if (recipients.length === 0) {
        Logger.warn(
          `${this.DEBUG_PREFIX} No recipients found for message ${messageId}`
        );
      }

      const counts = {
        messageId,
        total: recipients.length,
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        successRate: 0,
        lastUpdated: null as Date | null,
      };

      recipients.forEach((recipient) => {
        switch (recipient.status) {
          case MessageStatus.PENDING:
            counts.pending++;
            break;
          case MessageStatus.PROCESSING:
            counts.processing++;
            break;
          case MessageStatus.SENT:
            counts.sent++;
            break;
          case MessageStatus.FAILED:
            counts.failed++;
            break;
        }

        // Track most recent update
        if (
          recipient.last_updated_date &&
          (!counts.lastUpdated ||
            recipient.last_updated_date > counts.lastUpdated)
        ) {
          counts.lastUpdated = recipient.last_updated_date;
        }
      });

      counts.successRate =
        counts.total > 0 ? (counts.sent / counts.total) * 100 : 0;

      Logger.debug(`${this.DEBUG_PREFIX} Message status retrieved`, counts);

      return counts;
    } catch (error) {
      Logger.error(
        `${this.DEBUG_PREFIX} Error getting message status for message ${messageId}:`,
        {}
      );
      throw error;
    }
  }

  /**
   * Retry failed recipients for a message
   */
  async retryFailedRecipients(messageId: number): Promise<{
    retriedCount: number;
    totalFailed: number;
  }> {
    const debugId = `RETRY-${messageId}`;
    Logger.info(
      `${this.DEBUG_PREFIX} [${debugId}] Starting retry for failed recipients`
    );

    try {
      const failedRecipients = await this.recipientRepository.find({
        where: {
          message_id: messageId,
          status: MessageStatus.FAILED,
        },
      });

      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Found ${failedRecipients.length} failed recipients to retry`
      );

      if (failedRecipients.length === 0) {
        return { retriedCount: 0, totalFailed: 0 };
      }

      // Reset failed recipients to pending
      for (const recipient of failedRecipients) {
        recipient.status = MessageStatus.PENDING;
        recipient.last_updated_date = new Date();
      }

      await this.recipientRepository.save(failedRecipients);
      Logger.info(
        `${this.DEBUG_PREFIX} [${debugId}] Reset ${failedRecipients.length} recipients to PENDING status`
      );

      // Restart email processing
      setTimeout(() => {
        this.processMessageQueue(messageId, undefined, debugId).catch(
          (error) => {
            Logger.error(
              `${this.DEBUG_PREFIX} [${debugId}] Error in retry email processing:`,
              error
            );
          }
        );
      }, 100);

      return {
        retriedCount: failedRecipients.length,
        totalFailed: failedRecipients.length,
      };
    } catch (error) {
      Logger.error(
        `${this.DEBUG_PREFIX} [${debugId}] Error retrying failed recipients:`
      );
      throw error;
    }
  }

  /**
   * Process basic variables in content
   */
  static processBasicVariables(
    content: string,
    firstName?: string,
    lastName?: string
  ): string {
    let processedContent = content;

    // Replace firstName - handle empty/null values gracefully
    if (firstName !== null && firstName !== undefined) {
      processedContent = processedContent.replace(
        /\{\{firstName\}\}/g,
        firstName.trim() || "[First Name]"
      );
    } 
    // else {
    //   // Replace with placeholder when data is missing
    //   processedContent = processedContent.replace(
    //     /\{\{firstName\}\}/g,
    //     "[First Name]"
    //   );
    // }

    // Replace lastName - handle empty/null values gracefully
    if (lastName !== null && lastName !== undefined) {
      processedContent = processedContent.replace(
        /\{\{lastName\}\}/g,
        lastName.trim() || "[Last Name]"
      );
    } 
    // else {
    //   // Replace with placeholder when data is missing
    //   processedContent = processedContent.replace(
    //     /\{\{lastName\}\}/g,
    //     "[Last Name]"
    //   );
    // }

    return processedContent;
  }

  /**
   * Get player data for variable processing
   */
  // private async getPlayerData(
  //   playerId: number,
  //   groupId: number
  // ): Promise<any | null> {
  //   try {
  //     // Try service method first
  //     if (this.playerRepository && this.playerRepository.getPlayerById) {
  //       return await this.playerRepository.getPlayerById(playerId, groupId);
  //     } else {
  //       // Direct repository query as fallback
  //       const playerRepository = AppDataSource.getRepository(Player);
  //       const player = await playerRepository.findOne({
  //         where: {
  //           id: playerId,
  //           group: { id: groupId }, // Ensure we only get players from the correct group
  //         },
  //         select: ["id", "first_name", "last_name", "email"],
  //       });

  //       if (player) {
  //         Logger.debug(`${this.DEBUG_PREFIX} Player data retrieved:`, {
  //           id: player.id,
  //           firstName: player.first_name || "[missing]",
  //           lastName: player.last_name || "[missing]",
  //           email: player.email || "[missing]",
  //         });
  //       } else {
  //         Logger.warn(
  //           `${this.DEBUG_PREFIX} No player found for ID: ${playerId}`
  //         );
  //       }

  //       return player;
  //     }
  //   } catch (error) {
  //     Logger.error(`Error fetching player data for ID ${playerId}:`, error);
  //     return null;
  //   }
  // }

  /**
   * Get evaluator data for variable processing
   */
  // private async getEvaluatorData(evaluatorId: number): Promise<any | null> {
  //   try {
  //     Logger.debug(
  //       `${this.DEBUG_PREFIX} Fetching evaluator data for ID: ${evaluatorId}`
  //     );

  //     let evaluator = null;

  //     // Try service method first
  //     if (this.userService && this.userService.getUserById) {
  //       evaluator = await this.userService.getUserById(evaluatorId);
  //     } else {
  //       // Direct repository query as fallback
  //       const userRepository = AppDataSource.getRepository(User);
  //       evaluator = await userRepository.findOne({
  //         where: { id: evaluatorId },
  //         select: ["id", "firstName", "lastName", "email"],
  //       });
  //     }

  //     if (evaluator) {
  //       // Log what data we actually got
  //       Logger.debug(`${this.DEBUG_PREFIX} Evaluator data retrieved:`, {
  //         id: evaluator.id,
  //         firstName: evaluator.firstName || "[missing]",
  //         lastName: evaluator.lastName || "[missing]",
  //         email: evaluator.email || "[missing]",
  //       });
  //     } else {
  //       Logger.warn(
  //         `${this.DEBUG_PREFIX} No evaluator found for ID: ${evaluatorId}`
  //       );
  //     }

  //     return evaluator;
  //   } catch (error) {
  //     Logger.error(
  //       `${this.DEBUG_PREFIX} Error fetching evaluator data for ID ${evaluatorId}:`,
  //       error
  //     );
  //     return null;
  //   }
  // }

  private logVariableProcessing(
    originalSubject: string,
    originalBody: string,
    processedSubject: string,
    processedBody: string,
    firstName?: string,
    lastName?: string,
    debugId?: string
  ): void {
    const subjectChanged = originalSubject !== processedSubject;
    const bodyChanged = originalBody !== processedBody;

    if (subjectChanged || bodyChanged) {
      Logger.debug(`${this.DEBUG_PREFIX} [${debugId}] Variables processed:`, {
        subjectChanged,
        bodyChanged,
        variables: {
          firstName: firstName || "[missing]",
          lastName: lastName || "[missing]",
        },
        // Show a sample of what was replaced
        sampleReplacement: originalBody.includes("{{firstName}}")
          ? `{{firstName}} → ${firstName || "[missing]"}`
          : "No firstName variable found",
      });
    } else {
      // Check if variables exist but weren't processed
      const hasVariables = /\{\{(firstName|lastName)\}\}/.test(
        originalSubject + originalBody
      );

      if (hasVariables) {
        Logger.warn(
          `${this.DEBUG_PREFIX} [${debugId}] Variables found but not processed - missing data:`,
          {
            hasFirstName: !!firstName,
            hasLastName: !!lastName,
            firstNameValue: firstName || "[empty/null/undefined]",
            lastNameValue: lastName || "[empty/null/undefined]",
          }
        );
      } else {
        Logger.debug(
          `${this.DEBUG_PREFIX} [${debugId}] No variables found in content`
        );
      }
    }
  }
}
