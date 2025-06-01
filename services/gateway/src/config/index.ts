import dotenv from 'dotenv';
import path from 'path';

const envFilePath = path.join(process.cwd(), '.env');

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: envFilePath });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: envFilePath.replace('.env', '.env.production') });
} else {
    dotenv.config({ path: envFilePath });
}

export interface ServiceUrls {
    auth: string;
    chat: string;
    files: string;
    media: string;
    notifications: string;
}

export const serviceUrls: ServiceUrls = {
    auth: process.env.AUTH_SERVICE_URL!,
    chat: process.env.CHAT_SERVICE_URL!,
    files: process.env.FILES_SERVICE_URL!,
    media: process.env.MEDIA_SERVICE_URL!,
    notifications: process.env.NOTIFICATIONS_SERVICE_URL!,
};

export const config = {
    port: process.env.GATEWAY_PORT || 8080,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    bodyLimit: '50mb',
    proxyTimeout: 30000,
};

export const validateConfig = (): void => {
    const requiredUrls = Object.entries(serviceUrls);
    const missingUrls = requiredUrls.filter(([, url]) => !url);

    if (missingUrls.length > 0) {
        console.error('Missing required environment variables:');
        missingUrls.forEach(([service]) => {
            const envVarName =
                service === 'auth'
                    ? 'AUTH_SERVICE_URL'
                    : service === 'files'
                    ? 'FILES_SERVICE_URL'
                    : service === 'notifications'
                    ? 'NOTIFICATIONS_SERVICE_URL'
                    : `${service.toUpperCase()}_SERVICE_URL`;
            console.error(`- ${envVarName}`);
        });
        process.exit(1);
    }
};
