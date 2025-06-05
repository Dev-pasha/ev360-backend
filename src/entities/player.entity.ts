// src/entities/Player.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { Group } from "./group.entity";
import { Position } from "./group-position.entity";
import { Team } from "./team.entity";
import { Category } from "./player-category.entity";
import { PlayerList } from "./player-list.entity";
import { GroupTemplateCategory } from "./group-template-category.entity";
import { User } from "./user.entity";

export enum Gender {
  MALE = 1,
  FEMALE = 2,
  OTHER = 3,
}

export enum JerseyColor {
  RED = 1,
  BLUE = 2,
  GREEN = 3,
  YELLOW = 4,
  BLACK = 5,
  WHITE = 6,
  // Add other colors as needed
}

export enum Hand {
  RIGHT = 1,
  LEFT = 2,
  AMBIDEXTROUS = 3,
}

export enum Foot {
  RIGHT = 1,
  LEFT = 2,
  AMBIDEXTROUS = 3,
}

@Entity("players")
export class Player {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ nullable: true })
  number?: number;

  @Column({ nullable: true })
  jersey_colour?: JerseyColor;

  @Column({ type: "date", nullable: true })
  date_of_birth?: Date;

  @Column({
    type: "enum",
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @ManyToOne(() => Group, { nullable: false })
  @JoinColumn({ name: "groupId" }) // Add this line
  group!: Group;

  @Column({ nullable: true })
  headshot?: string; // URL to headshot image

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: "primary_position_id" }) // Add this line
  primary_position!: Position | null;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: "secondary_position_id" }) // Add this line
  secondary_position!: Position | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  height?: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column({
    type: "enum",
    enum: Hand,
    nullable: true,
  })
  hand?: Hand;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  secondary_email?: string;

  @Column({
    type: "enum",
    enum: Foot,
    nullable: true,
  })
  foot?: Foot;

  @Column({ nullable: true })
  level?: string;

  @Column({ nullable: true })
  zone?: string;

  @Column({ nullable: true })
  custom_field_1?: string;

  @Column({ nullable: true })
  custom_field_2?: string;

  @Column({ nullable: true })
  custom_field_3?: string;

  @Column({ nullable: true })
  custom_field_4?: string;

  @Column({ default: false })
  check_in!: boolean;

  @Column({ default: false, nullable: true })
  archived!: boolean;

  @ManyToOne(() => Team, (team) => team.players, { nullable: true })
  @JoinColumn({ name: "teamId" }) // Add this line
  team!: Team | null;

  @ManyToMany(() => PlayerList, (playerList) => playerList.players)
  // @JoinTable({
  //   name: "player_list_players",
  //   joinColumn: { name: "player_id", referencedColumnName: "id" },
  //   inverseJoinColumn: { name: "player_list_id", referencedColumnName: "id" },
  // })
  player_lists!: PlayerList[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Many-to-many relationship with categories
  @ManyToMany(() => Category)
  @JoinTable({
    name: "player_categories",
    joinColumn: { name: "player_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "category_id", referencedColumnName: "id" },
  })
  categories!: Category[];
}
