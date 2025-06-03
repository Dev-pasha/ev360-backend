import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("saas_owners")
export class SaasOwner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("IDX_SAAS_OWNERS_EMAIL")
  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  @Column({ name: "first_name", nullable: true, length: 100 })
  firstName!: string;

  @Column({ name: "last_name", nullable: true, length: 100 })
  lastName!: string;

  @Column({ name: "company_name", nullable: true, length: 200 })
  companyName!: string;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Index("IDX_SAAS_OWNERS_LAST_LOGIN")
  @Column({ name: "last_login_at", nullable: true })
  lastLoginAt!: Date;

  @Column({ name: "password_reset_token", nullable: true, length: 255, type: "varchar" })
  passwordResetToken!: string | null;

  @Column({ name: "password_reset_expires", nullable: true, type: "timestamp" })
  passwordResetExpires!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Virtual property to get full name
  get fullName(): string {
    return `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }

  // Method to check if password reset token is valid
  isPasswordResetTokenValid(): boolean {
    return !!(
      this.passwordResetToken &&
      this.passwordResetExpires &&
      this.passwordResetExpires > new Date()
    );
  }
}
