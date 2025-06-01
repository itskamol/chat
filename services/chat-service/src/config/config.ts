import { config as dotenvConfig } from "dotenv"; // Renamed to avoid conflict
import path from 'path';
// console.log("Loading configuration...", process.env.NODE_ENV);
const filePath = path.join(process.cwd(), 'env', '.env'); // Adjusted to match the directory structure
// Determine the correct path to .env file based on current environment
const envPath = process.env.NODE_ENV === 'development' ? `${filePath}.local` : `${filePath}.production.env`;
dotenvConfig({ path: envPath });

const { 
    MONGO_URI, 
    PORT, 
    JWT_SECRET, 
    NODE_ENV, 
    MESSAGE_BROKER_URL,
    // STORAGE_TYPE, // Removed
    // AWS_ACCESS_KEY_ID, // Removed
    // AWS_SECRET_ACCESS_KEY, // Removed
    // AWS_REGION, // Removed
    // AWS_S3_BUCKET_NAME, // Removed
    // S3_FILE_BASE_URL, // Removed
    MEDIA_SERVER_URL,
    MAX_FILE_SIZE_MB, // Re-added for backward compatibility with tests
    ALLOWED_MIME_TYPES, // Re-added for backward compatibility with tests
    FILE_SERVICE_URL, // Added
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
if (!FILE_SERVICE_URL) {
    console.error("FATAL ERROR: FILE_SERVICE_URL is not defined.");
    process.exit(1);
}


export default {
    MONGO_URI,
    PORT: PORT || "8082", // Default port if not specified
    JWT_SECRET,
    env: NODE_ENV || "development",
    msgBrokerURL: MESSAGE_BROKER_URL,
    queue,
    // STORAGE_TYPE: STORAGE_TYPE || "local", // Removed
    // AWS_ACCESS_KEY_ID, // Removed
    // AWS_SECRET_ACCESS_KEY, // Removed
    // AWS_REGION, // Removed
    // AWS_S3_BUCKET_NAME, // Removed
    // S3_FILE_BASE_URL, // Removed
    MEDIA_SERVER_URL,
    maxFileSizeBytes: (parseInt(MAX_FILE_SIZE_MB || "10") * 1024 * 1024), // Re-added for backward compatibility with tests
    allowedMimeTypesSet: new Set((ALLOWED_MIME_TYPES || "image/jpeg,image/png,video/mp4,audio/webm,application/pdf").split(',')), // Re-added for backward compatibility with tests
    FILE_SERVICE_URL, // Added
};