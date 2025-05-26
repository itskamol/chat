import AWS from 'aws-sdk';
import fs from 'fs';
import config from '../config/config'; // Assuming config loads env variables
import { logger } from '../utils';

// Configure AWS S3
// Ensure your environment variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME are set.
const s3 = new AWS.S3({
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION,
});

interface UploadResult {
    location: string; // URL of the uploaded file
    key: string;      // Key of the file in S3
}

/**
 * Uploads a file to AWS S3.
 * @param fileBuffer Buffer of the file to upload.
 * @param originalname Original name of the file.
 * @param mimeType MIME type of the file.
 * @returns Promise resolving to an object containing the S3 Location and Key.
 */
export const uploadFileToS3 = async (
    fileBuffer: Buffer,
    originalname: string,
    mimeType: string
): Promise<UploadResult> => {
    if (!config.AWS_S3_BUCKET_NAME) {
        throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables.');
    }

    const s3Key = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;

    const params: AWS.S3.PutObjectRequest = {
        Bucket: config.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read', // Or 'private' if you plan to use pre-signed URLs for access
    };

    try {
        const data = await s3.upload(params).promise();
        logger.info(`File uploaded successfully to S3. Location: ${data.Location}, Key: ${data.Key}`);
        return { location: data.Location, key: data.Key };
    } catch (error) {
        logger.error('Error uploading file to S3:', error);
        throw error; // Re-throw to be handled by the caller
    }
};

/**
 * Deletes a file from AWS S3.
 * @param s3Key Key of the file in S3 to delete.
 * @returns Promise resolving to void.
 */
export const deleteFileFromS3 = async (s3Key: string): Promise<void> => {
    if (!config.AWS_S3_BUCKET_NAME) {
        throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables.');
    }
    if (!s3Key) {
        logger.warn('No S3 key provided for deletion.');
        return;
    }

    const params: AWS.S3.DeleteObjectRequest = {
        Bucket: config.AWS_S3_BUCKET_NAME,
        Key: s3Key,
    };

    try {
        await s3.deleteObject(params).promise();
        logger.info(`File deleted successfully from S3. Key: ${s3Key}`);
    } catch (error) {
        logger.error(`Error deleting file from S3 (Key: ${s3Key}):`, error);
        throw error; // Re-throw to be handled by the caller
    }
};

// Example usage of reading a file for upload (if multer saves to disk first)
// export const uploadLocalFileToS3 = async (filePath: string, originalname: string, mimeType: string): Promise<UploadResult> => {
//   const fileBuffer = fs.readFileSync(filePath);
//   return uploadFileToS3(fileBuffer, originalname, mimeType);
// };
