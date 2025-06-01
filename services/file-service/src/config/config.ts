/**
 * @file config.ts
 * @description Handles application configuration by loading environment variables from a .env file.
 * It validates the presence of critical variables and exports a typed configuration object.
 * The application will exit if critical AWS credentials or bucket information is missing.
 */
import dotenv from 'dotenv';
import path from 'path';

const filePath = path.join(process.cwd(), 'env', '.env'); // Adjusted to match the directory structure
// Determine the correct path to .env file based on current environment
const envPath = process.env.NODE_ENV === 'development' ? `${filePath}.local` : `${filePath}.production.env`;
dotenv.config({ path: envPath }); // Load environment variables from .env file into process.env

/**
 * Retrieves an environment variable by its key.
 * Throws an error if a required variable is missing and no default value is provided.
 * @param {string} key - The key of the environment variable.
 * @param {boolean} [required=true] - Whether the environment variable is required.
 * @param {string} [defaultValue] - A default value to use if the variable is not set.
 * @returns {string} The value of the environment variable.
 * @throws {Error} If a required variable is missing and no default value is set.
 */
function getEnvVariable(
    key: string,
    required: boolean = true,
    defaultValue?: string
): string {
    const value = process.env[key];
    if (required && !value && !defaultValue) {
        // If required, not present, and no default, throw error
        throw new Error(`Missing critical environment variable: ${key}`);
    }
    return value || defaultValue || '';
}

let configData;

try {
    const PORT = getEnvVariable('PORT', false, '3000');
    const AWS_ACCESS_KEY_ID = getEnvVariable('AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = getEnvVariable('AWS_SECRET_ACCESS_KEY');
    const AWS_REGION = getEnvVariable('AWS_REGION');
    const BUCKET_NAME = getEnvVariable('BUCKET_NAME');
    const MAX_FILE_SIZE_MB = getEnvVariable('MAX_FILE_SIZE_MB', false, '10');

    configData = {
        PORT: parseInt(PORT, 10),
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
        AWS_REGION,
        BUCKET_NAME,
        MAX_FILE_SIZE_MB: parseInt(MAX_FILE_SIZE_MB, 10),
    };
} catch (error) {
    console.error(
        '--------------------------------------------------------------------'
    );
    console.error(
        'FATAL ERROR: Failed to initialize application configuration.'
    );
    if (error instanceof Error) {
        console.error(`Reason: ${error.message}`);
    } else {
        console.error(
            'An unknown error occurred during configuration loading.'
        );
    }
    console.error('Please check your .env file or environment variable setup.');
    console.error('Application will now exit.');
    console.error(
        '--------------------------------------------------------------------'
    );
    process.exit(1); // Exit the application if configuration fails
}

/**
 * @constant config
 * @description The application's configuration object, derived from environment variables.
 * Includes settings for the server port, AWS credentials, S3 bucket details,
 * maximum file size, and allowed MIME types for uploads.
 */
export const config = configData;
