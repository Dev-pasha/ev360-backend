import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm";
import { Subscription } from "./subscription.entity";

export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUAL = "annual"
}

@Entity("subscription_plans")
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @Column({
    type: "enum",
    enum: BillingCycle,
    default: BillingCycle.MONTHLY
  })
  billing_cycle!: BillingCycle;

  @Column({ type: "int" })
  max_groups!: number;

  @Column({ type: "int" })
  max_users_per_group!: number;

  @Column({ type: "int" })
  max_players_per_group!: number;

  @Column({ type: "boolean", default: false })
  is_custom!: boolean;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions!: Subscription[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}