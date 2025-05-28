import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommandInput, HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid'; // For generating unique keys

/**
 * @constant s3Client
 * @description Instance of the S3Client, configured with AWS region and credentials from the application config.
 * This client is used for all interactions with AWS S3.
 */
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file to S3.
 * @param fileBuffer Buffer of the file to upload.
 * @param originalFileName Original name of the file.
 * @param mimeType Mime type of the file.
 * @returns Object containing the S3 URL, key, and bucket name.
 */
export const uploadFileToS3 = async (fileBuffer: Buffer, originalFileName: string, mimeType: string) => {
  const uniqueKey = `${uuidv4()}-${originalFileName}`;
  const params: PutObjectCommandInput = {
    Bucket: config.BUCKET_NAME,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: { 
      /**
       * 'originalfilename' is a custom metadata field.
       * S3 metadata keys are typically stored in lowercase.
       * This helps in retrieving the original filename when downloading,
       * as the S3 key itself is a UUID-prefixed version.
       */
      originalfilename: originalFileName 
    }
    // ACL: 'public-read', // Example: Set ACL to public-read for direct URL access.
                         // Consider security implications. Pre-signed URLs are generally safer.
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    const url = `https://${config.BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${uniqueKey}`;
    console.log(`File uploaded successfully to S3: ${url}`);
    return {
      url,
      key: uniqueKey,
      bucket: config.BUCKET_NAME,
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Gets S3 object metadata.
 * @param key S3 key of the file.
 * @returns Promise resolving to HeadObjectCommandOutput containing metadata.
 */
export const getFileMetadataFromS3 = async (key: string): Promise<HeadObjectCommandOutput> => {
  const params = {
    Bucket: config.BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new HeadObjectCommand(params);
    const metadata = await s3Client.send(command);
    console.log(`Successfully retrieved metadata for key: ${key}`);
    return metadata;
  } catch (error) {
    console.error(`Error getting metadata from S3 for key ${key}:`, error);
    throw error;
  }
};


/**
 * Gets a readable stream for a file from S3.
 * @param key S3 key of the file.
 * @returns ReadableStream of the file body.
 */
export const getFileStreamFromS3 = async (key: string) => {
  const params = {
    Bucket: config.BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`Successfully retrieved file stream for key: ${key}`);
    return response.Body as Readable;
  } catch (error) {
    console.error(`Error getting file stream from S3 for key ${key}:`, error);
    throw error;
  }
};

/**
 * Deletes a file from S3.
 * @param key S3 key of the file to delete.
 * @returns Promise that resolves when deletion is successful.
 */
export const deleteFileFromS3 = async (key: string) => {
  const params = {
    Bucket: config.BUCKET_NAME,
    Key: key,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`File deleted successfully from S3: ${key}`);
  } catch (error) {
    console.error(`Error deleting file from S3 for key ${key}:`, error);
    throw error;
  }
};
