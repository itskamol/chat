/**
 * @file fileRoutes.ts
 * @description Defines the Express routes for file operations within the file-service.
 * It maps HTTP methods and URL paths to specific controller functions.
 * Middleware for handling multipart/form-data (Multer) is applied to the upload route.
 * Swagger JSDoc comments are used for API documentation.
 */
import { Router } from 'express';
import { uploadFileController, getFileController, deleteFileController } from '../controllers/fileController';
import upload from '../utils/multerConfig'; // Configured Multer instance for file upload handling

const router = Router();

// General Swagger tag definition for all routes in this module
/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management and operations
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a new file
 *     tags: [Files] # Associates this route with the 'Files' tag in Swagger UI
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload. Multer middleware (`upload.single('file')`) will process this.
 *     responses:
 *       201:
 *         description: File uploaded successfully. Returns file metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: "https://your-bucket.s3.region.amazonaws.com/unique-key-filename.jpg"
 *                 key:
 *                   type: string
 *                   example: "unique-key-filename.jpg"
 *                 type:
 *                   type: string
 *                   example: "image/jpeg"
 *                 size:
 *                   type: number
 *                   example: 102400
 *                 originalName:
 *                   type: string
 *                   example: "filename.jpg"
 *                 bucket:
 *                   type: string
 *                   example: "your-bucket-name"
 *       400:
 *         description: Bad request (e.g., no file uploaded, unsupported file type, file too large).
 *       500:
 *         description: Internal server error.
 */
router.post('/upload', upload.single('file'), uploadFileController); // 'file' is the field name multer expects

/**
 * @swagger
 * /api/files/{key}:
 *   get:
 *     summary: Download or view a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The S3 key of the file to retrieve.
 *     responses:
 *       200:
 *         description: File content. Content-Type and Content-Disposition headers will be set appropriately.
 *         content:
 *           application/octet-stream: {} # Or other appropriate content types
 *           image/jpeg: {}
 *           application/pdf: {}
 *       400:
 *         description: Bad request (e.g., missing key).
 *       404:
 *         description: File not found.
 *       500:
 *         description: Internal server error or error streaming file.
 */
router.get('/:key', getFileController);

/**
 * @swagger
 * /api/files/{key}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The S3 key of the file to delete.
 *     responses:
 *       200:
 *         description: File deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File deleted successfully"
 *                 key:
 *                   type: string
 *                   example: "unique-key-filename.jpg"
 *       400:
 *         description: Bad request (e.g., missing key).
 *       404:
 *         description: File not found, cannot delete.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:key', deleteFileController);

export default router;
