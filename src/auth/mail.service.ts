import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT');
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (host && port && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465, // true for 465, false for other ports
                auth: {
                    user,
                    pass,
                },
            });
            this.logger.log('📧 SMTP Mailer successfully configured.');
        } else {
            this.logger.warn('⚠️ SMTP credentials missing from configuration. Mailer will run in console fallback mode.');
        }
    }

    async sendResetCode(email: string, code: string): Promise<boolean> {
        const from = this.configService.get<string>('SMTP_FROM', 'Halal Checker <no-reply@scanbazar.com>');

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from,
                    to: email,
                    subject: 'Password Reset Verification Code - Halal App',
                    text: `Your password reset verification code is: ${code}. This code will expire in 15 minutes.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #074330;">Reset Your Password</h2>
                            <p>You requested a password reset for your Scan Bazar App account.</p>
                            <p>Please use the following 6-digit verification code to complete your password reset:</p>
                            <div style="font-size: 24px; font-weight: bold; background-color: #f4f4f4; padding: 10px 20px; border-radius: 8px; display: inline-block; letter-spacing: 4px; color: #074330; margin: 15px 0;">
                                ${code}
                            </div>
                            <p>This code is valid for <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply directly to this email.</p>
                        </div>
                    `,
                });
                this.logger.log(`✅ Verification email successfully sent to ${email}`);
                return true;
            } catch (error) {
                this.logger.error(`❌ Failed to send reset email to ${email}:`, error);
            }
        }

        // Console fallback
        console.log('\n==================================================');
        console.log(`🔑 PASSWORD RESET CODE FOR ${email.toUpperCase()}:`);
        console.log(`👉   [ ${code} ]   👈`);
        console.log('==================================================\n');
        return true;
    }
}
