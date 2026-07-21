import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const SMTP_IPS: Record<string, string> = {
  'smtp.gmail.com': '142.250.141.109',
  'smtp-relay.brevo.com': '172.246.243.66',
  'smtp.sendgrid.net': '159.183.177.31',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtpEmail(email: string, code: string): Promise<void> {
    const host = this.config.getOrThrow('MAIL_HOST');
    const ip = SMTP_IPS[host] ?? host;

    const transporter = nodemailer.createTransport({
      host: ip,
      port: parseInt(this.config.getOrThrow('MAIL_PORT'), 10),
      secure: false,
      tls: { servername: host },
      auth: {
        user: this.config.getOrThrow('MAIL_USER'),
        pass: this.config.getOrThrow('MAIL_PASS'),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    const from = this.config.get('MAIL_FROM') || 'AFF Festival <noreply@aff2026.ci>';

    await transporter.sendMail({
      from,
      to: email,
      subject: 'AFF Festival — Code de vérification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">Africa Future Festival</h2>
          <p>Votre code de vérification :</p>
          <div style="background: #f0f0f5; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a1a2e;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Ce code expire dans <strong>10 minutes</strong>.<br>
            Si vous n'avez pas demandé ce code, ignorez cet email.
          </p>
        </div>
      `,
    });

    this.logger.log(`OTP email sent to ${email}`);
  }
}
