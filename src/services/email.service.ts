import Logger from "../config/logger";
import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    // Note: In production, you would use actual SMTP credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE === "true" || true,
      auth: {
        user: process.env.SMTP_USER || "abdullahkhalid1398@gmail.com",
        pass: process.env.SMTP_PASSWORD || "nmgychjrljcvjnxq",
      },
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      Logger.info(`Email sent to ${options.to}`);
    } catch (error) {
      Logger.error("Error sending email:", error);
      throw error;
    }
  }
}
