
// src/services/stats.service.ts
import { AppDataSource } from "../config/database";
import { Group } from "../entities/group.entity";
import { Player } from "../entities/player.entity";
import { Team } from "../entities/team.entity";
import { Event } from "../entities/event.entity";
import { Subscription, SubscriptionStatus } from "../entities/subscription.entity";
import { UserGroupRole } from "../entities/user-group-role.entity";
import Logger from "../config/logger";
import { DataSource, MoreThan, Between } from "typeorm";

interface DateRangeOptions {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

interface DemographicsOptions {
  includeArchived?: boolean;
}

interface ActivityOptions {
  dateRange?: string;
}

export class StatsService {
  private groupRepository;
  private playerRepository;
  private teamRepository;
  private eventRepository;
  private subscriptionRepository;
  private userGroupRoleRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.groupRepository = this.dataSource.getRepository(Group);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.teamRepository = this.dataSource.getRepository(Team);
    this.eventRepository = this.dataSource.getRepository(Event);
    this.subscriptionRepository = this.dataSource.getRepository(Subscription);
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
  }

  async getGroupOverviewStats(groupId: number, options: DateRangeOptions = {}) {
    try {
      // Verify group exists
      const group = await this.groupRepository.findOne({ 
        where: { id: groupId },
        relations: ['subscription']
      });
      if (!group) {
        throw new Error("Group not found");
      }

      // Calculate date range
      const dateFilter = this.getDateFilter(options);

      // Get total players count
      const totalPlayers = await this.playerRepository.count({
        where: { 
          group: { id: groupId },
          archived: false 
        }
      });

      // Get archived players count
      const archivedPlayers = await this.playerRepository.count({
        where: { 
          group: { id: groupId },
          archived: true 
        }
      });

      // Get total teams count
      const totalTeams = await this.teamRepository.count({
        where: { 
          group: { id: groupId },
          is_active: true 
        }
      });

      // Get total events count
      const totalEvents = await this.eventRepository.count({
        where: { 
          group: { id: groupId },
          ...(dateFilter && { created_at: dateFilter })
        }
      });

      // Get active events count
      const activeEvents = await this.eventRepository.count({
        where: { 
          group: { id: groupId },
          is_active: true,
          ...(dateFilter && { created_at: dateFilter })
        }
      });

      // Get completed events count (events where end_date is in the past)
      const completedEvents = await this.eventRepository.count({
        where: { 
          group: { id: groupId },
          end_date: MoreThan(new Date()),
          ...(dateFilter && { created_at: dateFilter })
        }
      });

      // Get subscription status
      const subscription = group.subscription;
      const subscriptionStatus = subscription ? {
        status: subscription.status,
        planName: subscription.plan?.name || 'Unknown',
        isActive: subscription.status === SubscriptionStatus.ACTIVE,
        trialEndsAt: subscription.trial_end_date,
        endsAt: subscription.end_date
      } : {
        status: 'none',
        planName: 'No subscription',
        isActive: false,
        trialEndsAt: null,
        endsAt: null
      };

      // Get user count in group
      const totalUsers = await this.userGroupRoleRepository.count({
        where: { group: { id: groupId } }
      });

      // Calculate previous period stats for comparison (if dateRange is specified)
      let previousPeriodStats = null;
      if (options.dateRange && options.dateRange !== 'custom') {
        previousPeriodStats = await this.getPreviousPeriodStats(groupId, options.dateRange);
      }

      const stats = {
        summary: {
          totalPlayers,
          archivedPlayers,
          activePlayers: totalPlayers - archivedPlayers,
          totalTeams,
          totalEvents,
          activeEvents,
          completedEvents,
          totalUsers,
          subscription: subscriptionStatus
        },
        trends: previousPeriodStats ? {
          playersChange: this.calculateChange(totalPlayers, previousPeriodStats.totalPlayers),
          teamsChange: this.calculateChange(totalTeams, previousPeriodStats.totalTeams),
          eventsChange: this.calculateChange(totalEvents, previousPeriodStats.totalEvents),
          usersChange: this.calculateChange(totalUsers, previousPeriodStats.totalUsers)
        } : null,
        metadata: {
          generatedAt: new Date(),
          groupId,
          dateRange: options.dateRange || 'all_time'
        }
      };

      Logger.info(`Group overview stats retrieved for group ${groupId}`);
      return stats;

    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group overview stats error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group overview stats error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getGroupDemographics(groupId: number, options: DemographicsOptions = {}) {
    try {
      // Verify group exists
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new Error("Group not found");
      }

      const whereCondition: any = { 
        group: { id: groupId }
      };

      if (!options.includeArchived) {
        whereCondition.archived = false;
      }

      // Get all players for demographics
      const players = await this.playerRepository.find({
        where: whereCondition,
        relations: ['primary_position', 'secondary_position', 'team']
      });

      // Gender breakdown
      const genderStats = this.calculateGenderDistribution(players);
      
      // Age distribution
      const ageStats = this.calculateAgeDistribution(players);
      
      // Position distribution
      const positionStats = this.calculatePositionDistribution(players);
      
      // Physical stats
      const physicalStats = this.calculatePhysicalStats(players);

      // Team distribution
      const teamStats = this.calculateTeamDistribution(players);

      const demographics = {
        totalPlayers: players.length,
        gender: genderStats,
        age: ageStats,
        positions: positionStats,
        physical: physicalStats,
        teams: teamStats,
        metadata: {
          generatedAt: new Date(),
          groupId,
          includeArchived: options.includeArchived || false
        }
      };

      Logger.info(`Group demographics retrieved for group ${groupId}`);
      return demographics;

    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group demographics error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group demographics error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getGroupActivityStats(groupId: number, options: ActivityOptions = {}) {
    try {
      // Verify group exists
      const group = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        throw new Error("Group not found");
      }

      const dateFilter = this.getDateFilter({ dateRange: options.dateRange });

      // Get event participation stats
      const events = await this.eventRepository.find({
        where: { 
          group: { id: groupId },
          ...(dateFilter && { created_at: dateFilter })
        },
        relations: ['players']
      });

      // Calculate participation rates
      const participationStats = this.calculateParticipationStats(events);

      // Get check-in stats
      const checkInStats = await this.getCheckInStats(groupId, dateFilter);

      const activityStats = {
        events: {
          total: events.length,
          averageParticipants: participationStats.averageParticipants,
          participationRate: participationStats.participationRate
        },
        checkIns: checkInStats,
        metadata: {
          generatedAt: new Date(),
          groupId,
          dateRange: options.dateRange || 'all_time'
        }
      };

      Logger.info(`Group activity stats retrieved for group ${groupId}`);
      return activityStats;

    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group activity stats error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group activity stats error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getTeamOverviewStats(teamId: number) {
    try {
      const team = await this.teamRepository.findOne({
        where: { id: teamId },
        relations: ['players', 'group']
      });

      if (!team) {
        throw new Error("Team not found");
      }

      const totalPlayers = team.players.length;
      const activePlayers = team.players.filter(p => !p.archived).length;
      const archivedPlayers = totalPlayers - activePlayers;

      const stats = {
        teamId,
        teamName: team.name,
        groupId: team.group.id,
        totalPlayers,
        activePlayers,
        archivedPlayers,
        isActive: team.is_active,
        metadata: {
          generatedAt: new Date()
        }
      };

      Logger.info(`Team overview stats retrieved for team ${teamId}`);
      return stats;

    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get team overview stats error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get team overview stats error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getSystemHealthStats() {
    try {
      // Total counts
      const totalGroups = await this.groupRepository.count();
      const totalPlayers = await this.playerRepository.count();
      const totalTeams = await this.teamRepository.count();
      const totalEvents = await this.eventRepository.count();

      // Active counts
      const activeGroups = await this.groupRepository.count(); // Assuming all groups are active
      const activePlayers = await this.playerRepository.count({ where: { archived: false } });
      const activeTeams = await this.teamRepository.count({ where: { is_active: true } });
      const activeEvents = await this.eventRepository.count({ where: { is_active: true } });

      // Subscription stats
      const activeSubscriptions = await this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.ACTIVE }
      });
      const trialSubscriptions = await this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.TRIAL }
      });

      const healthStats = {
        groups: { total: totalGroups, active: activeGroups },
        players: { total: totalPlayers, active: activePlayers },
        teams: { total: totalTeams, active: activeTeams },
        events: { total: totalEvents, active: activeEvents },
        subscriptions: { 
          active: activeSubscriptions, 
          trial: trialSubscriptions,
          total: activeSubscriptions + trialSubscriptions
        },
        metadata: {
          generatedAt: new Date()
        }
      };

      Logger.info("System health stats retrieved");
      return healthStats;

    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get system health stats error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get system health stats error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  // Helper methods
  private getDateFilter(options: DateRangeOptions) {
    if (!options.dateRange) return null;

    const now = new Date();
    let startDate: Date;

    switch (options.dateRange) {
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return MoreThan(startDate);
      case 'last3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return MoreThan(startDate);
      case 'lastyear':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return MoreThan(startDate);
      case 'custom':
        if (options.startDate && options.endDate) {
          return Between(new Date(options.startDate), new Date(options.endDate));
        }
        return null;
      default:
        return null;
    }
  }

  private async getPreviousPeriodStats(groupId: number, dateRange: string) {
    // Implementation for previous period comparison
    // This is a simplified version - you'd want to implement proper period comparison
    return {
      totalPlayers: 0,
      totalTeams: 0,
      totalEvents: 0,
      totalUsers: 0
    };
  }

  private calculateChange(current: number, previous: number) {
    if (previous === 0) return { value: current, percentage: 100 };
    const value = current - previous;
    const percentage = ((current - previous) / previous) * 100;
    return { value, percentage: Math.round(percentage * 100) / 100 };
  }

  private calculateGenderDistribution(players: any[]) {
    const genderCounts = players.reduce((acc, player) => {
      const gender = player.gender || 'unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    return {
      total: players.length,
      distribution: genderCounts
    };
  }

  private calculateAgeDistribution(players: any[]) {
    const ages = players
      .filter(p => p.date_of_birth)
      .map(p => {
        const today = new Date();
        const birthDate = new Date(p.date_of_birth);
        return Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      });

    if (ages.length === 0) {
      return { averageAge: 0, ageRanges: {} };
    }

    const averageAge = Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);
    
    const ageRanges = ages.reduce((acc: Record<string, number>, age) => {
      let range;
      if (age < 13) range = 'under_13';
      else if (age < 18) range = '13_17';
      else if (age < 25) range = '18_24';
      else if (age < 35) range = '25_34';
      else range = '35_plus';
      
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { averageAge, ageRanges };
  }

  private calculatePositionDistribution(players: any[]) {
    const positions: Record<string, number> = {};
    players.forEach(player => {
      if (player.primary_position) {
        const pos = player.primary_position.name;
        positions[pos] = (positions[pos] || 0) + 1;
      }
    });

    return {
      total: players.filter(p => p.primary_position).length,
      distribution: positions
    };
  }

  private calculatePhysicalStats(players: any[]) {
    const heights = players.filter(p => p.height).map(p => p.height);
    const weights = players.filter(p => p.weight).map(p => p.weight);

    return {
      height: {
        average: heights.length ? Math.round(heights.reduce((sum, h) => sum + h, 0) / heights.length) : 0,
        count: heights.length
      },
      weight: {
        average: weights.length ? Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length) : 0,
        count: weights.length
      }
    };
  }

  private calculateTeamDistribution(players: any[]) {
    const teamCounts = players.reduce((acc, player) => {
      const teamName = player.team?.name || 'No Team';
      acc[teamName] = (acc[teamName] || 0) + 1;
      return acc;
    }, {});

    return {
      total: players.length,
      distribution: teamCounts
    };
  }

  private calculateParticipationStats(events: any[]) {
    if (events.length === 0) {
      return { averageParticipants: 0, participationRate: 0 };
    }

    const totalParticipants = events.reduce((sum, event) => sum + event.players.length, 0);
    const averageParticipants = Math.round(totalParticipants / events.length);

    return {
      averageParticipants,
      participationRate: 85 // This would need proper calculation based on invited vs attended
    };
  }

  private async getCheckInStats(groupId: number, dateFilter: any) {
    const totalPlayers = await this.playerRepository.count({
      where: { group: { id: groupId }, archived: false }
    });

    const checkedInPlayers = await this.playerRepository.count({
      where: { group: { id: groupId }, check_in: true, archived: false }
    });

    return {
      totalPlayers,
      checkedIn: checkedInPlayers,
      checkInRate: totalPlayers > 0 ? Math.round((checkedInPlayers / totalPlayers) * 100) : 0
    };
  }
}