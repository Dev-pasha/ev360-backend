// "seed:templates": "ts-node src/seeder/GenericTemplateSeeder.ts",
import { AppDataSource } from '../config/database';
import { EvaluationTemplate } from '../entities/evaluation-template.entity';
import { TemplateCategory } from '../entities/evaluation-template-category.entity';
import { TemplateSkill } from '../entities/evaluation-template-skills.entity';
import { TemplateMetric } from '../entities/evaluation-template-metric-score.entity';
import { TemplateCustomLabel } from '../entities/evaluation-template-custom-label.entity';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger';

export class GenericTemplateSeeder {
  // Import templates from a JSON file
  public static async importFromFile(filePath: string): Promise<void> {
    logger.info(`Importing templates from file: ${filePath}`);
    
    try {
      const data = fs.readFileSync(path.resolve(filePath), 'utf8');
      const templates = JSON.parse(data);
      
      if (Array.isArray(templates)) {
        await GenericTemplateSeeder.importTemplates(templates);
        logger.info(`✅ ${templates.length} templates imported successfully from ${filePath}`);
      } else {
        await GenericTemplateSeeder.importTemplates([templates]);
        logger.info(`✅ 1 template imported successfully from ${filePath}`);
      }
    } catch (error) {
      logger.error('Error importing templates from file:', error);
      throw error;
    }
  }
  
  // Import templates from a list of template objects
  public static async importTemplates(templates: any[]): Promise<void> {
    logger.info(`Beginning import of ${templates.length} templates`);
    
    // Use a transaction to ensure all or nothing
    await AppDataSource.transaction(async (transactionalEntityManager: { findOne: (arg0: any, arg1: { where: { name: any; }; }) => any; create: (arg0: any, arg1: { name?: any; is_custom?: any; sport?: any; level?: any; template?: any; category?: any; order?: any; metric_type?: any; min_value?: any; max_value?: any; step?: any; units?: any; lower_score_is_better?: any; info?: any; meta?: any; skill?: any; label?: any; type?: any; options?: any; }) => any; save: (arg0: any) => any; }) => {
      for (const templateData of templates) {
        logger.info(`Processing template: ${templateData.name}`);
        
        // Check if template already exists
        const existingTemplate = await transactionalEntityManager.findOne(EvaluationTemplate, {
          where: { name: templateData.name }
        });
        
        if (existingTemplate) {
          logger.warn(`Template '${templateData.name}' already exists, skipping`);
          continue;
        }
        
        // Create template
        const template = transactionalEntityManager.create(EvaluationTemplate, {
          name: templateData.name,
          is_custom: templateData.is_custom || false,
          sport: templateData.sport,
          level: templateData.level
        });
        
        await transactionalEntityManager.save(template);
        logger.info(`Created template: ${template.name}`);
        
        // Create categories
        if (templateData.categories && Array.isArray(templateData.categories)) {
          logger.info(`Processing ${templateData.categories.length} categories for template: ${template.name}`);
          
          for (const categoryData of templateData.categories) {
            const category = transactionalEntityManager.create(TemplateCategory, {
              name: categoryData.name,
              template
            });
            
            await transactionalEntityManager.save(category);
            logger.info(`Created category: ${category.name}`);
            
            // Create skills
            if (categoryData.skills && Array.isArray(categoryData.skills)) {
              logger.info(`Processing ${categoryData.skills.length} skills for category: ${category.name}`);
              
              for (const skillData of categoryData.skills) {
                const skill = transactionalEntityManager.create(TemplateSkill, {
                  name: skillData.name,
                  category
                });
                
                await transactionalEntityManager.save(skill);
                logger.info(`Created skill: ${skill.name}`);
                
                // Create metrics
                if (skillData.metrics && Array.isArray(skillData.metrics)) {
                  logger.info(`Processing ${skillData.metrics.length} metrics for skill: ${skill.name}`);
                  
                  for (const metricData of skillData.metrics) {
                    const metric = transactionalEntityManager.create(TemplateMetric, {
                      name: metricData.name,
                      order: metricData.order || 0,
                      metric_type: metricData.metric_type,
                      min_value: metricData.min_value,
                      max_value: metricData.max_value,
                      step: metricData.step,
                      units: metricData.units,
                      lower_score_is_better: metricData.lower_score_is_better || false,
                      info: metricData.info,
                      meta: metricData.meta,
                      skill
                    });
                    
                    await transactionalEntityManager.save(metric);
                  }
                  logger.info(`Created ${skillData.metrics.length} metrics for skill: ${skill.name}`);
                }
              }
            }
          }
        }
        
        // Create custom labels
        if (templateData.custom_labels && Array.isArray(templateData.custom_labels)) {
          logger.info(`Processing ${templateData.custom_labels.length} custom labels for template: ${template.name}`);
          
          for (const labelData of templateData.custom_labels) {
            const customLabel = transactionalEntityManager.create(TemplateCustomLabel, {
              label: labelData.label,
              type: labelData.type,
              options: labelData.options,
              template
            });
            
            await transactionalEntityManager.save(customLabel);
          }
          logger.info(`Created ${templateData.custom_labels.length} custom labels for template: ${template.name}`);
        }
      }
    });
    
    logger.info('All templates imported successfully');
  }
}

// Allow running directly
if (require.main === module) {
  // Default path to templates.json
  const templatesFilePath = path.resolve(__dirname, '../data/templates.json');
  
  AppDataSource.initialize()
    .then(async () => {
      logger.info('Database connection initialized');
      await GenericTemplateSeeder.importFromFile(templatesFilePath);
      await AppDataSource.destroy();
      logger.info('Database connection closed');
      process.exit(0);
    })
    .catch((error: any) => {
      logger.error('Error during template seeding:', error);
      process.exit(1);
    });
}