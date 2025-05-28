// src/config/env.ts
import dotenvFlow from 'dotenv-flow';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';

dotenvFlow.config({
  path: process.cwd(),
  node_env: nodeEnv,
  default_node_env: 'development',
});

console.log(`NODE_ENV for chat-service: ${nodeEnv}`);
console.log(`Attempting to load .env files for chat-service based on NODE_ENV='${nodeEnv}'`);

interface EnvironmentVariables {
  MONGO_URI: string;
  PORT: number;
  JWT_SECRET: string;
  NODE_ENV: string; // This is the determined nodeEnv
  MESSAGE_BROKER_URL?: string;
  STORAGE_TYPE: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET_NAME?: string;
  S3_FILE_BASE_URL?: string;
  MEDIA_SERVER_URL?: string;
  MAX_FILE_SIZE_MB_STRING: string; // Keep the original string for reference if needed
  ALLOWED_MIME_TYPES_STRING: string; // Keep the original string

  // Derived and parsed values
  maxFileSizeBytes: number;
  allowedMimeTypesSet: Set<string>;
}

const maxFileSizeMbString = process.env.MAX_FILE_SIZE_MB || "10";
const allowedMimeTypesString = process.env.ALLOWED_MIME_TYPES || "image/jpeg,image/png,video/mp4,audio/webm,application/pdf";

export const env: EnvironmentVariables = {
  MONGO_URI: process.env.MONGO_URI || '', // Should have a default or be checked
  PORT: parseInt(process.env.PORT || '3001', 10), // chat-service originally used 3001 or 8082
  JWT_SECRET: process.env.JWT_SECRET || '', // Should have a default or be checked
  NODE_ENV: nodeEnv,
  MESSAGE_BROKER_URL: process.env.MESSAGE_BROKER_URL,
  STORAGE_TYPE: process.env.STORAGE_TYPE || "local",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  S3_FILE_BASE_URL: process.env.S3_FILE_BASE_URL,
  MEDIA_SERVER_URL: process.env.MEDIA_SERVER_URL,
  MAX_FILE_SIZE_MB_STRING: maxFileSizeMbString,
  ALLOWED_MIME_TYPES_STRING: allowedMimeTypesString,
  maxFileSizeBytes: (parseInt(maxFileSizeMbString) * 1024 * 1024),
  allowedMimeTypesSet: new Set(allowedMimeTypesString.split(',').map(s => s.trim())),
};

if (!env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined for chat-service.");
    // process.exit(1); // Consider exiting
}
if (!env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined for chat-service.");
    // process.exit(1); // Consider exiting
}

// Static application configurations
export const queueConfig = {
  notifications: "NOTIFICATIONS",
};
