/**
 * @file fileServiceClient.ts
 * @description This module provides a client for interacting with the external File Service.
 * It handles making HTTP requests to the File Service for operations like uploading files
 * and checking service health. It uses Axios for HTTP communication and FormData for file uploads.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import config from '../config/config'; // Application configuration, expecting FILE_SERVICE_URL
import logger from '../utils/logger'; // Logger utility
import ApiError from '../utils/apiError'; // Custom error class for consistent error handling

/**
 * @interface FileServiceUploadResponse
 * @description Defines the expected structure of a successful response from the File Service when a file is uploaded.
 * Includes details like the file URL, S3 key, MIME type, size, original name, and bucket.
 */
export interface FileServiceUploadResponse {
  url: string;
  key: string;
  type: string;
  size: number;
  originalName: string;
  bucket: string; // The S3 bucket where the file is stored.
}

/**
 * @constant fileServiceClient
 * @description An Axios instance configured for communication with the File Service.
 * It uses the `FILE_SERVICE_URL` from the application config as its base URL.
 * Timeout is optional and can be configured if needed.
 * Note: Default headers like 'Content-Type' are not set globally here,
 * as 'multipart/form-data' is specifically required for file uploads and is handled
 * by the FormData library in conjunction with Axios on a per-request basis.
 */
const fileServiceClient: AxiosInstance = axios.create({
  baseURL: config.FILE_SERVICE_URL,
  // timeout: 10000, // Optional: Configure a timeout for requests to the file-service
});

/**
 * Uploads a file to the remote File Service.
 * This function constructs a FormData object, appends the file buffer and its metadata,
 * and posts it to the File Service's /upload endpoint.
 * It handles errors from the File Service, including network issues and specific error responses.
 *
 * @param {Buffer} fileBuffer - The buffer containing the file data.
 * @param {string} originalName - The original name of the file.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {Promise<FileServiceUploadResponse>} A promise that resolves with the response from the File Service,
 *                                            containing details of the uploaded file.
 * @throws {ApiError} Throws an ApiError if the upload fails, with details from the File Service response or a generic error message.
 */
export async function uploadFileToService(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<FileServiceUploadResponse> {
  const formData = new FormData();
  formData.append('file', fileBuffer, {
    filename: originalName,
    contentType: mimeType,
  });

  try {
    logger.info(`[FileServiceClient] Uploading file to file-service: ${originalName}, type: ${mimeType}, size: ${fileBuffer.length} bytes`);
    
    const response = await fileServiceClient.post<FileServiceUploadResponse>(
      '/upload', // Endpoint relative to baseURL
      formData,
      {
        headers: {
          ...formData.getHeaders(), // Important for multipart/form-data with axios and form-data lib
          // Add any other specific headers if needed, e.g., an API key for file-service
        },
        maxBodyLength: Infinity, // Important for large file uploads
        maxContentLength: Infinity, // Important for large file uploads
      }
    );

    logger.info(`[FileServiceClient] File uploaded successfully to file-service. Key: ${response.data.key}, URL: ${response.data.url}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const errData = axiosError.response.data as { message?: string, statusCode?: number }; // Type assertion for error data
      logger.error('[FileServiceClient] Error response from file-service:', {
        status: axiosError.response.status,
        data: errData,
        originalName,
      });
      throw new ApiError(
        errData?.statusCode || axiosError.response.status,
        `File service error: ${errData?.message || axiosError.message}`
      );
    } else if (axiosError.request) {
      logger.error(`[FileServiceClient] No response received from file-service for ${originalName}:`, {
        message: axiosError.message,
        code: axiosError.code,
      });
      throw new ApiError(503, `File service (${config.FILE_SERVICE_URL}) is unreachable or did not respond.`);
    } else {
      logger.error(`[FileServiceClient] Error setting up request to file-service for ${originalName}:`, {
        message: axiosError.message,
      });
      throw new ApiError(500, `Failed to make request to file service: ${axiosError.message}`);
    }
  }
}

/**
 * Checks the health of the remote File Service.
 * Makes a GET request to the File Service's /health endpoint.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the File Service is healthy (responds with 200 OK),
 *                             and `false` otherwise.
 */
export async function checkFileServiceHealth(): Promise<boolean> {
    try {
        // Attempt to GET the /health endpoint of the file-service
        const response = await fileServiceClient.get('/health'); 
        // Consider a 2xx status as healthy
        return response.status >= 200 && response.status < 300; 
    } catch (error) {
        const axiosError = error as AxiosError;
        logger.error('[FileServiceClient] File service health check failed:', {
            message: axiosError.message,
            url: `${config.FILE_SERVICE_URL}/health`,
            code: axiosError.code,
            status: axiosError.response?.status
        });
        return false;
    }
}
