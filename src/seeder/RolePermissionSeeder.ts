//     "seed:roles": "ts-node src/seeder/RolePermissionSeeder.ts",

import { AppDataSource } from '../config/database';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import logger from '../config/logger';

export class RolePermissionSeeder {
  public static async run(): Promise<void> {
    logger.info('Starting Role and Permission seeding...');
    
    try {
      // Get repositories using the AppDataSource
      const roleRepository = AppDataSource.getRepository(Role);
      const permissionRepository = AppDataSource.getRepository(Permission);
      const rolePermissionRepository = AppDataSource.getRepository(RolePermission);

      // Create roles
      const roles = [
        { name: 'Owner', description: 'Full control over a group' },
        { name: 'Admin', description: 'Administrative capabilities' },
        { name: 'Coach', description: 'Manages players and evaluations' },
        { name: 'Evaluator', description: 'Performs evaluations' },
        { name: 'Player', description: 'Subject of evaluations' }
      ];

      // Save roles and store references
      logger.info('Creating roles...');
      const savedRoles: Record<string, Role> = {};
      for (const roleData of roles) {
        let role = await roleRepository.findOne({ where: { name: roleData.name } });
        if (!role) {
          role = roleRepository.create(roleData);
          await roleRepository.save(role);
          logger.info(`Created role: ${roleData.name}`);
        } else {
          logger.info(`Role already exists: ${roleData.name}`);
        }
        savedRoles[role.name] = role;
      }

      // Create permissions
      const permissions = [
        { name: 'manage_evaluation_template', description: 'Manage evaluation templates', category: 'Evaluation' },
        { name: 'edit_event_evaluators', description: 'Edit event evaluators', category: 'Event' },
        { name: 'edit_evaluator_scores', description: 'Edit evaluator scores', category: 'Evaluation' },
        { name: 'create_players', description: 'Create players', category: 'Player' },
        { name: 'edit_player_details', description: 'Edit player details', category: 'Player' },
        { name: 'manage_check_in', description: 'Manage check-in', category: 'Event' },
        { name: 'view_player_progress', description: 'View player progress', category: 'Reports' },
        { name: 'create_groups', description: 'Create groups', category: 'Group' },
        { name: 'invite_users', description: 'Invite users', category: 'User' },
        { name: 'assign_roles', description: 'Assign roles', category: 'User' },
        { name: 'create_teams', description: 'Create teams', category: 'Team' },
        { name: 'create_events', description: 'Create events', category: 'Event' },
        { name: 'send_messages', description: 'Send messages', category: 'Communication' },
        { name: 'view_reports', description: 'View reports', category: 'Reports' },
        { name: 'manage_resources', description: 'Manage resources', category: 'Resources' },
        { name: 'manage_group_settings', description: 'Manage group settings', category: 'Group' }
      ];

      // Save permissions and store references
      logger.info('Creating permissions...');
      const savedPermissions: Record<string, Permission> = {};
      for (const permData of permissions) {
        let permission = await permissionRepository.findOne({ where: { name: permData.name } });
        if (!permission) {
          permission = permissionRepository.create(permData);
          await permissionRepository.save(permission);
          logger.info(`Created permission: ${permData.name}`);
        } else {
          logger.info(`Permission already exists: ${permData.name}`);
        }
        savedPermissions[permission.name] = permission;
      }

      // Define role permissions
      const rolePermissions: Record<string, string[]> = {
        Owner: permissions.map(p => p.name), // Owner gets all permissions
        Admin: [
          'manage_evaluation_template', 'edit_event_evaluators', 'edit_evaluator_scores',
          'create_players', 'edit_player_details', 'manage_check_in', 'view_player_progress',
          'invite_users', 'create_teams', 'create_events', 'send_messages', 'view_reports',
          'manage_resources'
        ],
        Coach: [
          'create_players', 'edit_player_details', 'manage_check_in', 'view_player_progress',
          'create_teams', 'create_events', 'send_messages', 'view_reports', 'manage_resources'
        ],
        Evaluator: [
          'create_players', 'edit_player_details', 'manage_check_in'
        ],
        Player: [
          'view_player_progress'
        ]
      };

      // Assign permissions to roles
      logger.info('Assigning permissions to roles...');
      let assignedCount = 0;
      
      for (const roleName in rolePermissions) {
        const role = savedRoles[roleName];
        if (!role) {
          logger.warn(`Role not found: ${roleName}`);
          continue;
        }
        
        const permissionNames = rolePermissions[roleName];

        for (const permName of permissionNames) {
          const permission = savedPermissions[permName];
          if (!permission) {
            logger.warn(`Permission not found: ${permName}`);
            continue;
          }
          
          // Check if already exists
          const existing = await rolePermissionRepository.findOne({
            where: {
              role: { id: role.id },
              permission: { id: permission.id }
            },
            relations: ['role', 'permission']
          });

          if (!existing) {
            const rolePermission = rolePermissionRepository.create({
              role,
              permission
            });
            await rolePermissionRepository.save(rolePermission);
            assignedCount++;
          }
        }
      }

      logger.info(`Assigned ${assignedCount} new role-permission mappings`);
      logger.info('✅ Roles and permissions seeded successfully');
    } catch (error) {
      logger.error('Error during Role and Permission seeding:', error);
      throw error;
    }
  }
}

// Allow running directly
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await RolePermissionSeeder.run();
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during seeding:', error);
      process.exit(1);
    });
}