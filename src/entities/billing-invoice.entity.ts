import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from "typeorm";
import { User } from "./user.entity";
import { Subscription } from "./subscription.entity";

export enum InvoiceStatus {
  DRAFT = "draft",
  OPEN = "open",
  PAID = "paid",
  UNCOLLECTIBLE = "uncollectible",
  VOID = "void"
}

@Entity("billing_invoices")
export class BillingInvoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: "subscription_id" })
  subscription!: Subscription;

  @Column({ type: "varchar", nullable: true })
  external_invoice_id!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax_amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_amount!: number;

  @Column({
    type: "enum",
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT
  })
  status!: InvoiceStatus;

  @Column({ type: "timestamp" })
  due_date!: Date;

  @Column({ type: "timestamp", nullable: true })
  paid_date!: Date | null;

  @Column({ type: "jsonb", nullable: true })
  line_items!: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;

  @Column({ type: "varchar", nullable: true })
  invoice_url!: string | null;

  @Column({ type: "varchar", nullable: true })
  receipt_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}