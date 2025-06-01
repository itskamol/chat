/**
 * @file fileService.ts (in chat-service)
 * @description This class, formerly responsible for local file handling and S3 uploads directly within chat-service,
 * has been significantly refactored. Its primary remaining utility is to map MIME types (now received from the
 * dedicated file-service) to the chat-service's internal message type categories (e.g., 'image', 'video').
 * Most file handling logic, including storage, validation, and direct S3 interaction, has been
 * delegated to the external `file-service`.
 */
export class FileService {
    // private static allowedTypes = { // This logic is now delegated to the file-service.
    //     image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    //     video: ['video/mp4', 'video/webm', 'video/ogg'],
    //     audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'],
    //     file: ['application/pdf', 'text/plain']
    // };
    
    // static validateFileType(mimetype: string): boolean { // Validation is now handled by the dedicated file-service.
    //     // ...
    // }

    /**
     * Determines the internal message type for chat messages based on the file's MIME type.
     * This utility is used to categorize files for display or handling within the chat application
     * (e.g., rendering an image tag vs. a generic file download link).
     * The MIME type is provided by the `file-service` after a successful upload.
     *
     * @param {string} mimetype - The MIME type of the file (e.g., "image/jpeg", "application/pdf").
     * @returns {'image' | 'video' | 'audio' | 'file'} The determined message category.
     *          Returns 'file' as a default for unrecognized or generic MIME types.
     */
    static getMessageType(mimetype: string): 'image' | 'video' | 'audio' | 'file' {
        if (!mimetype) {
            // If mimetype is undefined or empty, default to 'file' or consider logging an warning.
            return 'file'; 
        }
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'file'; // Default for other recognized document types or generic files
    }

    // static async uploadFile(file: Express.Multer.File): Promise<FileUploadResult> { 
    //     // This method was removed. File uploads are now handled by FileController 
    //     // calling the fileServiceClient, which communicates with the dedicated file-service.
    // }

    // static async cleanupFile(filePath: string): Promise<void> { 
    //     // This method was removed. Temporary file cleanup (if any) is not relevant here
    //     // as multer uses memoryStorage, and permanent storage is managed by file-service.
    // }
}
