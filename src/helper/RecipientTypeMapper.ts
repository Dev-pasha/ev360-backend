import { RecipientType } from "entities/message.entity";

export class RecipientTypeMapper {
  private static readonly FRONTEND_TO_BACKEND_MAP: Record<string, RecipientType> = {
    'all-players': RecipientType.PLAYERS,
    'players': RecipientType.PLAYERS,
    'all-evaluators': RecipientType.EVALUATORS,
    'evaluators': RecipientType.EVALUATORS,
    // Direct enum values (for backward compatibility)
    'PLAYERS': RecipientType.PLAYERS,
    'EVALUATORS': RecipientType.EVALUATORS
  };

  static mapRecipientType(frontendType: string): RecipientType {
    const mapped = this.FRONTEND_TO_BACKEND_MAP[frontendType];
    if (!mapped) {
      throw new Error(`Invalid recipient type: ${frontendType}. Valid values are: ${Object.keys(this.FRONTEND_TO_BACKEND_MAP).join(', ')}`);
    }
    return mapped;
  }

  static getSupportedFrontendTypes(): string[] {
    return Object.keys(this.FRONTEND_TO_BACKEND_MAP);
  }
}