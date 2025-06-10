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

  /**
   * Send a password reset email
   */

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const subject = "Password Reset Request";
    const resetUrl = `https://yourapp.com/reset-password?token=${resetToken}`;
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4a6baf;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4a6baf;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Password Reset Request</h1>
      </div>
      
      <div class="content">
        <p>Dear User,</p>
        
        <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
        
        <p>To reset your password, please click the button below:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        
        <p>If you have any questions or need assistance, don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The Team</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          <p>If you didn't request this change, please contact us immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    await this.sendEmail({
      to: email,
      from: '"Your Company Name" <your-email@example.com>',
      subject,
      html,
    });
  }

  /**
   * Send a welcome email to new customers
   */
  async sendWelcomeEmail(data: {
    to: string;
    firstName: string;
    lastName: string;
    temporaryPassword?: string;
    subscriptionPlan?: {
      name: string;
      price: number;
      billingCycle: string;
    };
  }): Promise<void> {
    const fullName = `${data.firstName} ${data.lastName}`;
    const subject = `Welcome to Our Service, ${data.firstName}!`;

    // Format price if subscription exists
    const formattedPrice = data.subscriptionPlan
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(data.subscriptionPlan.price)
      : "";

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4a6baf;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4a6baf;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
        }
        .password-box {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
          word-break: break-all;
        }
        .subscription-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #e8f4ff;
          border-radius: 5px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Our Platform, ${data.firstName}!</h1>
      </div>
      
      <div class="content">
        <p>Dear ${fullName},</p>
        
        <p>We're thrilled to welcome you to our platform! Your account has been successfully created.</p>
        
        ${
          data.temporaryPassword
            ? `
        <p>Here are your login details:</p>
        <p><strong>Email:</strong> ${data.to}</p>
        <p><strong>Temporary Password:</strong></p>
        <div class="password-box">${data.temporaryPassword}</div>
        <p>For security reasons, we recommend changing your password after your first login.</p>
        `
            : ""
        }
        
        ${
          data.subscriptionPlan
            ? `
        <div class="subscription-details">
          <h3>Your Subscription Details</h3>
          <p><strong>Plan:</strong> ${data.subscriptionPlan.name}</p>
          <p><strong>Price:</strong> ${formattedPrice} per ${data.subscriptionPlan.billingCycle}</p>
          <p>Thank you for choosing our service!</p>
        </div>
        `
            : ""
        }
        
        <p>To get started, please click the button below:</p>
        <a href="https://yourapp.com/login" class="button">Login to Your Account</a>
        
        <p>If you have any questions or need assistance, don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The Team</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          <p>If you didn't request this account, please contact us immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await this.sendEmail({
      to: data.to,
      from: '"Your Company Name" <support@yourcompany.com>',
      subject: subject,
      html: html,
      text: this.generateWelcomeText(data), // Fallback text version
    });
  }

  /**
   * Generate plain text version of the welcome email
   */
  private generateWelcomeText(data: {
    to: string;
    firstName: string;
    lastName: string;
    temporaryPassword?: string;
    subscriptionPlan?: {
      name: string;
      price: number;
      billingCycle: string;
    };
  }): string {
    const fullName = `${data.firstName} ${data.lastName}`;
    let text = `Welcome to Our Platform, ${fullName}!\n\n`;
    text += `We're thrilled to welcome you to our platform! Your account has been successfully created.\n\n`;

    if (data.temporaryPassword) {
      text += `Here are your login details:\n`;
      text += `Email: ${data.to}\n`;
      text += `Temporary Password: ${data.temporaryPassword}\n\n`;
      text += `For security reasons, we recommend changing your password after your first login.\n\n`;
    }

    if (data.subscriptionPlan) {
      const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(data.subscriptionPlan.price);

      text += `Your Subscription Details:\n`;
      text += `Plan: ${data.subscriptionPlan.name}\n`;
      text += `Price: ${formattedPrice} per ${data.subscriptionPlan.billingCycle}\n\n`;
      text += `Thank you for choosing our service!\n\n`;
    }

    text += `To get started, please visit: https://yourapp.com/login\n\n`;
    text += `If you have any questions or need assistance, don't hesitate to contact our support team.\n\n`;
    text += `Best regards,\nThe Team\n\n`;
    text += `© ${new Date().getFullYear()} Your Company Name. All rights reserved.\n`;
    text += `If you didn't request this account, please contact us immediately.`;

    return text;
  }
}
