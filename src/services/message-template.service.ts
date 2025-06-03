import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { MessageTemplate } from "../entities/message-template.entity";
import Logger from "../config/logger";

export interface MessageTemplateInput {
  name: string;
  subject: string;
  body: string;
}

export class MessageTemplateService {
  private messageTemplateRepository: Repository<MessageTemplate>;

  constructor() {
    this.messageTemplateRepository =
      AppDataSource.getRepository(MessageTemplate);
  }

  /**
   * Create a new message template
   */
  async createMessageTemplate(
    groupId: number,
    templateData: MessageTemplateInput
  ): Promise<MessageTemplate> {
    try {
      const template = this.messageTemplateRepository.create({
        ...templateData,
        group_id: groupId,
      });

      return await this.messageTemplateRepository.save(template);
    } catch (error) {
      Logger.error("Error creating message template:", error);
      throw error;
    }
  }

  /**
   * Get all message templates for a group
   */
  async getGroupMessageTemplates(groupId: number): Promise<MessageTemplate[]> {
    try {
      return await this.messageTemplateRepository.find({
        where: { group_id: groupId },
        order: { created_at: "DESC" },
      });
    } catch (error) {
      Logger.error(
        `Error getting message templates for group ${groupId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get message template by ID
   */
  async getMessageTemplateById(id: number): Promise<MessageTemplate> {
    try {
      const template = await this.messageTemplateRepository.findOne({
        where: { id },
      });

      if (!template) {
        throw new Error(`Message template with ID ${id} not found`);
      }

      return template;
    } catch (error) {
      Logger.error(`Error getting message template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a message template
   */
  async updateMessageTemplate(
    templateId: number,
    templateData: Partial<MessageTemplateInput>
  ): Promise<MessageTemplate> {
    try {
      const template = await this.getMessageTemplateById(templateId);

      // Update template properties
      if (templateData.name) template.name = templateData.name;
      if (templateData.subject) template.subject = templateData.subject;
      if (templateData.body) template.body = templateData.body;

      return await this.messageTemplateRepository.save(template);
    } catch (error) {
      Logger.error(`Error updating message template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a message template
   */
  async deleteMessageTemplate(templateId: number): Promise<boolean> {
    try {
      const result = await this.messageTemplateRepository.delete(templateId);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      Logger.error(`Error deleting message template ${templateId}:`, error);
      throw error;
    }
  }

  
  // recipient emails and count
  
 
}
