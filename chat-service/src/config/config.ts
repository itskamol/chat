import { config as dotenvConfig } from "dotenv"; // Renamed to avoid conflict
import path from 'path';

// Determine the correct path to .env file based on current environment
const envPath = process.env.NODE_ENV === 'production' ? path.resolve(__dirname, '../../.env') : path.resolve(__dirname, '../../.env');
dotenvConfig({ path: envPath });

const { 
    MONGO_URI, 
    PORT, 
    JWT_SECRET, 
    NODE_ENV, 
    MESSAGE_BROKER_URL,
    STORAGE_TYPE,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET_NAME,
    S3_FILE_BASE_URL,
    MEDIA_SERVER_URL,
    MAX_FILE_SIZE_MB,
    ALLOWED_MIME_TYPES,
} = process.env;

const queue = { notifications: "NOTIFICATIONS" };

// Validate essential configurations
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}


export default {
    MONGO_URI,
    PORT: PORT || "8082", // Default port if not specified
    JWT_SECRET,
    env: NODE_ENV || "development",
    msgBrokerURL: MESSAGE_BROKER_URL,
    queue,
    STORAGE_TYPE: STORAGE_TYPE || "local", // Default to local storage
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET_NAME,
    S3_FILE_BASE_URL,
    MEDIA_SERVER_URL,
    maxFileSizeBytes: (parseInt(MAX_FILE_SIZE_MB || "10") * 1024 * 1024), // Default to 10MB if not set
    allowedMimeTypesSet: new Set((ALLOWED_MIME_TYPES || "image/jpeg,image/png,video/mp4,audio/webm,application/pdf").split(',')),
};