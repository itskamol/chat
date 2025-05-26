# Media Messages Feature (Audio, File Attachments)

## Overview

The media messages feature allows users to send and receive not just text, but also audio recordings, images, videos, and other file attachments within chats. This enhances the richness of communication.

## Services Involved / Architecture

1.  **UI (`ui` service):**
    *   **Audio Recording:** Uses the `useAudioRecorder` custom hook, leveraging `navigator.mediaDevices.getUserMedia` and `MediaRecorder` API to capture audio.
    *   **File Attachment:** Provides a file input (`<input type="file">`) for users to select various file types.
    *   **Previews:** Generates client-side previews for selected images, videos, and recorded audio using `URL.createObjectURL()`.
    *   **Upload Handling:**
        *   Constructs `FormData` to send the file and associated metadata (caption, sender/receiver IDs).
        *   Uses `XMLHttpRequest` to upload files to the `chat-service`, enabling progress tracking.
        *   Displays upload progress and status (uploading, failed, sent) optimistically in the chat window.
    *   **Rendering:** Displays different message types distinctly in the chat:
        *   Playable `<audio>` and `<video>` elements.
        *   Viewable `<img>` elements (often linked to full-size view).
        *   Download links for generic files, showing filename, size, and a type icon.

2.  **Chat Service (`chat-service`):**
    *   **File Upload Endpoint (`POST /v1/messages/upload`):**
        *   Receives `multipart/form-data` requests.
        *   Uses `multer` middleware for handling file streams, temporary storage, and validation.
    *   **File Validation:** Validates uploads against configured `MAX_FILE_SIZE_MB` and `ALLOWED_MIME_TYPES`.
    *   **Storage Backend:**
        *   If `STORAGE_TYPE=local`: Saves files to a local directory (`uploads/` within the service, mapped to `./chat_service_uploads` on the host via Docker volume).
        *   If `STORAGE_TYPE=s3`: Uploads files to an AWS S3 bucket using `aws-sdk`. Temporary local files created by Multer are deleted after successful S3 upload.
    *   **Database:** Saves message metadata to MongoDB, including:
        *   `messageType` (e.g., 'audio', 'image', 'video', 'file', 'text').
        *   `fileUrl` (either a local path like `/media/unique-filename.ext` or an S3 URL).
        *   `fileName` (original name of the file).
        *   `storedFileName` (unique name on disk if local storage).
        *   `fileMimeType`, `fileSize`.
        *   `originalMessage` (caption for the file).
    *   **File Serving (for local storage, `GET /media/:filename`):**
        *   Serves locally stored files.
        *   This route is protected by authentication (`authMiddleware`).
        *   Authorization logic ensures only the sender or receiver of the message (to which the file belongs) can access the file.

## Configuration (Key Environment Variables)

These variables are primarily for the `chat-service` and are typically set in the root `.env` file.

```env
# Determines where uploaded files are stored. Options: 'local' or 's3'.
STORAGE_TYPE=local

# --- AWS S3 Configuration (only required if STORAGE_TYPE=s3) ---
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=YOUR_AWS_REGION
AWS_S3_BUCKET_NAME=YOUR_AWS_S3_BUCKET_NAME
# Optional: Base URL for S3 files if not using the direct Location from S3 response, or for CDN.
# S3_FILE_BASE_URL=https://your-cdn.com/

# --- File Upload Validation ---
# Maximum allowed file size in Megabytes.
MAX_FILE_SIZE_MB=10

# Comma-separated list of allowed MIME types for uploads.
# Example:
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,video/mp4,audio/webm,audio/mpeg,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

The UI also uses `NEXT_PUBLIC_API_BASE_URL_CHAT_SERVICE` (e.g., `http://localhost:8082` or Nginx path) to construct URLs for fetching locally stored media.

## Basic Usage / API Endpoints

### File Upload

*   **Endpoint:** `POST /v1/messages/upload` (in `chat-service`)
*   **Request Type:** `multipart/form-data`
*   **Authentication:** Required (JWT Bearer token).
*   **Form Fields:**
    *   `mediaFile`: The actual file being uploaded.
    *   `senderId`: ID of the sender (usually derived from auth token on backend).
    *   `receiverId`: ID of the recipient.
    *   `messageType`: Type of the media (e.g., 'audio', 'image', 'video', 'file').
    *   `originalMessage` (optional): Caption for the file.
*   **Response (Success - 201 Created):** JSON object of the created message document from MongoDB, including the `fileUrl`.
*   **Response (Error):**
    *   `400 Bad Request`: Missing file, invalid parameters.
    *   `413 Payload Too Large`: File exceeds `MAX_FILE_SIZE_MB`.
    *   `415 Unsupported Media Type`: File MIME type not in `ALLOWED_MIME_TYPES`.
    *   `500 Internal Server Error`: Server-side issues (e.g., S3 upload failure, DB error).

### File Serving (for `STORAGE_TYPE=local`)

*   **Endpoint:** `GET /media/:filename` (in `chat-service`)
*   **Authentication:** Required (JWT Bearer token).
*   **Authorization:** User must be the sender or receiver of the message associated with the requested `filename` (which corresponds to `storedFileName` in the database).
*   **Response (Success - 200 OK):** The file content.
*   **Response (Error):**
    *   `400 Bad Request`: Invalid filename.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User not authorized to access the file.
    *   `404 Not Found`: File not found (either no DB record or file missing from disk).
    *   `500 Internal Server Error`.

If `STORAGE_TYPE=s3`, clients use the `fileUrl` (which will be an S3 URL) directly from the message object to fetch the file from S3.
```
