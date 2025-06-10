import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany
} from "typeorm";
import { User } from "./user.entity";
import { SubscriptionPlan } from "./subscription-plan.entity";
import { BillingInvoice } from "./billing-invoice.entity";

export enum SubscriptionStatus {
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  TRIAL = "trial",
  EXPIRED = "expired"
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: "plan_id" })
  plan!: SubscriptionPlan;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE
  })
  status!: SubscriptionStatus;

  @Column({ type: "timestamp" })
  start_date!: Date;

  @Column({ type: "timestamp", nullable: true })
  end_date!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  trial_end_date!: Date | null;

  @Column({ type: "varchar", nullable: true })
  external_subscription_id!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: any;

  @OneToMany(() => BillingInvoice, invoice => invoice.subscription)
  invoices!: BillingInvoice[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}