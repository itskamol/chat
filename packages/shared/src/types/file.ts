// File validation configuration
export const ALLOWED_FILE_TYPES = {
    image: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
    ],
    video: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/avi',
        'video/mov',
        'video/wmv',
    ],
    audio: [
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/mpeg',
        'audio/aac',
        'audio/flac',
        'audio/m4a',
    ],
    document: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    archive: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip',
    ],
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 50 * 1024 * 1024, // 50MB
    document: 25 * 1024 * 1024, // 25MB
    archive: 50 * 1024 * 1024, // 50MB
    default: 10 * 1024 * 1024, // 10MB
} as const;

// Type definitions
export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;
export type FileSizeCategory = keyof typeof FILE_SIZE_LIMITS;

// Common file info interface
export interface FileInfo {
    type: string;
    size: number;
    name?: string;
}

// Create ALLOWED_MIME_TYPES array for backward compatibility
export const ALLOWED_MIME_TYPES: readonly string[] = [
    ...ALLOWED_FILE_TYPES.image,
    ...ALLOWED_FILE_TYPES.video,
    ...ALLOWED_FILE_TYPES.audio,
    ...ALLOWED_FILE_TYPES.document,
    ...ALLOWED_FILE_TYPES.archive,
];

// Utility functions that work with any file-like object
export const validateFileType = (
    file: FileInfo,
    category: FileCategory
): boolean => {
    const allowedTypes = ALLOWED_FILE_TYPES[category] as readonly string[];
    return allowedTypes.includes(file.type);
};

export const validateFileSize = (
    file: FileInfo,
    category: FileSizeCategory
): boolean => {
    const limit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;
    return file.size <= limit;
};

export const getFileCategory = (mimeType: string): FileCategory | null => {
    for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES) as Array<[FileCategory, readonly string[]]>) {
        if (types.includes(mimeType)) {
            return category;
        }
    }
    return null;
};

export const validateFile = (
    file: FileInfo
): {
    isValid: boolean;
    error?: string;
    category?: FileCategory;
} => {
    const category = getFileCategory(file.type);

    if (!category) {
        return {
            isValid: false,
            error: `Unsupported file type: ${file.type}`,
        };
    }

    if (!validateFileSize(file, category)) {
        const limitMB = Math.round(FILE_SIZE_LIMITS[category] / (1024 * 1024));
        return {
            isValid: false,
            error: `File size exceeds ${limitMB}MB limit for ${category} files`,
        };
    }

    return {
        isValid: true,
        category,
    };
};

// Browser-specific validation (for frontend)
export const validateBrowserFile = (
    file: File
): {
    isValid: boolean;
    error?: string;
    category?: FileCategory;
} => {
    return validateFile({
        type: file.type,
        size: file.size,
        name: file.name,
    });
};

// Node.js-specific validation (for backend)
export const validateNodeFile = (file: {
    mimetype: string;
    size: number;
    originalname?: string;
}): {
    isValid: boolean;
    error?: string;
    category?: FileCategory;
} => {
    return validateFile({
        type: file.mimetype,
        size: file.size,
        name: file.originalname,
    });
};

// Additional utility functions
export const getAllowedTypesForCategory = (category: FileCategory): readonly string[] => {
    return ALLOWED_FILE_TYPES[category];
};

export const getSizeLimitForCategory = (category: FileSizeCategory): number => {
    return FILE_SIZE_LIMITS[category];
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidFileType = (mimeType: string): boolean => {
    return getFileCategory(mimeType) !== null;
};

// Export file upload response interface
export interface FileUploadResponse {
    fileUrl: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
}