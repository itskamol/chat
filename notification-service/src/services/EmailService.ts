import nodemailer from "nodemailer";
import config from "../config/config";
import logger from '@shared/utils/logger';

export class EmailService {
    private transporter;

    constructor() {
        logger.info('Initializing Email Service');
        this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: false,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
        logger.debug('Email transport configured', {
            host: config.smtp.host,
            port: config.smtp.port,
            secure: false,
        });
    }

    async sendEmail(to: string, subject: string, content: string) {
        logger.debug('Preparing to send email', { to, subject });
        
        const mailOptions = {
            from: config.EMAIL_FROM,
            to: to,
            subject: subject,
            html: content,
        };

        try {
            logger.debug('Sending email', { to, subject });
            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Email sent successfully', {
                messageId: info.messageId,
                to,
                subject
            });
        } catch (error) {
            logger.error('Failed to send email:', {
                error,
                to,
                subject
            });
            throw error;
        }
    }
}