import { Request, Response } from "express";
import { EvaluationTemplateService } from "../services/evaluation-template.service";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import logger from "../config/logger";

export class EvaluationTemplateController {
  private evaluationTemplateService: EvaluationTemplateService;

  constructor() {
    this.evaluationTemplateService = new EvaluationTemplateService();
  }

  GetEvaluationTemplates = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get evaluation templates failed", 400, errors));
        return;
      }
      // Get evaluation templates
      const evaluationTemplates =
        await this.evaluationTemplateService.getEvaluationTemplates();

      res.status(200).json(
        successResponse({
          message: "Evaluation templates retrieved successfully.",
          evaluationTemplates,
        })
      );
    } catch (error) {
      logger.error("Error in getting evaluation templates: ", error);
      res
        .status(400)
        .json(errorResponse("Get evaluation templates failed", 400, error));
    }
  };

  GetEvaluationTemplateById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get evaluation template failed", 400, errors));
        return;
      }
      const { id } = req.params;

      // Get evaluation template by ID
      const evaluationTemplate =
        await this.evaluationTemplateService.getEvaluationTemplateById(id);

      res.status(200).json(
        successResponse({
          message: "Evaluation template retrieved successfully.",
          evaluationTemplate,
        })
      );
    } catch (error) {
      logger.error("Error in getting evaluation template: ", error);
      res
        .status(400)
        .json(errorResponse("Get evaluation template failed", 400, error));
    }
  };
}
