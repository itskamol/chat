/**
 * @file fileService.ts
 * @description This service layer acts as an intermediary between the controllers and the S3 utility functions.
 * It orchestrates file operations like uploading, retrieving metadata, getting file streams, and deleting files,
 * by calling the respective functions from `s3Client.ts`. It also handles initial validation or data transformation
 * if needed, before interacting with the S3 utilities.
 */
import { uploadFileToS3 as s3Upload, getFileStreamFromS3 as s3GetStream, deleteFileFromS3 as s3Delete, getFileMetadataFromS3 as s3GetMetadata } from '../utils/s3Client';
// import { config } from '../config/config'; // Not strictly needed here as s3Client.ts handles config directly
import { Readable } from 'stream';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';

/**
 * Uploads a file using the S3 utility and returns enhanced file information.
 * @param file Express.Multer.File object, typically from multer middleware. This object contains the file buffer, original name, mimetype, and size.
 * @returns {Promise<object>} A promise that resolves to an object containing the S3 URL, S3 key, file mime type, size in bytes, original filename, and the S3 bucket name.
 * @throws Will re-throw any errors encountered during the S3 upload process.
 */
export const uploadFile = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error('File is undefined or null.');
  }
  console.log(`[FileService] Starting upload for file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
  try {
    const { url, key, bucket } = await s3Upload(file.buffer, file.originalname, file.mimetype);
    console.log(`[FileService] File uploaded successfully. Key: ${key}, URL: ${url}`);
    return {
      url,
      key,
      type: file.mimetype,
      size: file.size, // in bytes
      originalName: file.originalname,
      bucket, // Added bucket for completeness, though not strictly in requirements
    };
  } catch (error) {
    console.error(`[FileService] Error during upload for file: ${file.originalname}. Error: ${error}`);
    throw error; // Re-throw the error to be handled by the controller or error middleware
  }
};

/**
 * Retrieves file metadata from S3.
 * @param key The S3 object key of the file.
 * @returns {Promise<HeadObjectCommandOutput>} A promise that resolves to the S3 object metadata (HeadObjectCommandOutput from AWS SDK).
 * @throws Will re-throw any errors encountered while fetching metadata from S3.
 */
export const getFileMetadata = async (key: string): Promise<HeadObjectCommandOutput> => {
  if (!key) {
    throw new Error('S3 key is undefined or null.');
  }
  console.log(`[FileService] Requesting file metadata for key: ${key}`);
  try {
    const metadata = await s3GetMetadata(key);
    console.log(`[FileService] Successfully retrieved metadata for key: ${key}`);
    return metadata;
  } catch (error) {
    console.error(`[FileService] Error retrieving metadata for key ${key}. Error: ${error}`);
    throw error;
  }
};

/**
 * Retrieves a readable stream for a file from S3.
 * @param key The S3 object key of the file.
 * @returns {Promise<Readable>} A promise that resolves to a ReadableStream of the file body from S3.
 * @throws Will re-throw any errors encountered while fetching the file stream from S3.
 */
export const getFileInputStream = async (key: string): Promise<Readable> => {
  if (!key) {
    throw new Error('S3 key is undefined or null.');
  }
  console.log(`[FileService] Requesting file stream for key: ${key}`);
  try {
    const stream = await s3GetStream(key);
    console.log(`[FileService] Successfully retrieved stream for key: ${key}`);
    return stream;
  } catch (error) {
    console.error(`[FileService] Error retrieving stream for key ${key}. Error: ${error}`);
    throw error;
  }
};

/**
 * Deletes a file from S3.
 * @param key The S3 object key of the file to delete.
 * @returns {Promise<void>} A promise that resolves when the file deletion from S3 is successful.
 * @throws Will re-throw any errors encountered during the S3 deletion process.
 */
export const deleteFile = async (key: string): Promise<void> => {
  if (!key) {
    throw new Error('S3 key is undefined or null.');
  }
  console.log(`[FileService] Requesting deletion for key: ${key}`);
  try {
    await s3Delete(key);
    console.log(`[FileService] Successfully deleted file with key: ${key}`);
  } catch (error) {
    console.error(`[FileService] Error deleting file with key ${key}. Error: ${error}`);
    throw error;
  }
};
