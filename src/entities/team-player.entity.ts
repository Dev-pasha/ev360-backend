import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { Player } from './player.entity';

@Entity('team_players')
export class TeamPlayer {
  @PrimaryGeneratedColumn()
    id!: number;

  @ManyToOne(() => Team, team => team.players, { nullable: false })
    team!: Team;

  @ManyToOne(() => Player, player => player.team)
    player!: Player;

  @CreateDateColumn()
    created_at!: Date;

  @UpdateDateColumn()
    updated_at!: Date;
}