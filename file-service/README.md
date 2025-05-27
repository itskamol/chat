# File Service

## 1. Service Overview

The File Service is a microservice responsible for handling file uploads, downloads, and deletions. It is designed to store files in an AWS S3 bucket and provide a simple API for managing these files.

## 2. API Endpoints

All endpoints are prefixed with `/api/files`.

---

### Upload File

*   **Method:** `POST`
*   **Path:** `/upload`
*   **Description:** Uploads a new file to the AWS S3 bucket.
*   **Request:**
    *   `multipart/form-data`
    *   Must include a `file` field containing the binary data of the file.
*   **Successful Response (201 Created):**
    ```json
    {
        "url": "https://your-bucket-name.s3.your-aws-region.amazonaws.com/unique-key-originalfilename.jpg",
        "key": "unique-key-originalfilename.jpg",
        "type": "image/jpeg",
        "size": 123456, // in bytes
        "originalName": "originalfilename.jpg",
        "bucket": "your-bucket-name"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: No file uploaded, unsupported file type, file too large.
        ```json
        {
            "status": "error",
            "statusCode": 400,
            "message": "No file uploaded." 
        }
        ```
        ```json
        {
            "status": "error",
            "statusCode": 400,
            "message": "Unsupported file type: text/plain. Allowed types: image/jpeg, image/png" 
        }
        ```
    *   `500 Internal Server Error`: Error during upload to S3 or other server-side issues.
        ```json
        {
            "status": "error",
            "statusCode": 500,
            "message": "Internal Server Error"
        }
        ```

---

### Get/Download File

*   **Method:** `GET`
*   **Path:** `/:key`
*   **Description:** Downloads a file identified by its S3 key. The service streams the file from S3 with appropriate `Content-Type` and `Content-Disposition` headers.
*   **Request:**
    *   URL parameter `:key` representing the S3 object key.
*   **Successful Response (200 OK):**
    *   The raw file data with headers like:
        *   `Content-Type: <file_mime_type>`
        *   `Content-Length: <file_size_in_bytes>`
        *   `Content-Disposition: inline; filename="<original_filename>"`
*   **Error Responses:**
    *   `400 Bad Request`: File key is missing.
    *   `404 Not Found`: File with the given key does not exist in S3.
        ```json
        {
            "status": "error",
            "statusCode": 404,
            "message": "File not found."
        }
        ```
    *   `500 Internal Server Error`: Error streaming the file from S3.

---

### Delete File

*   **Method:** `DELETE`
*   **Path:** `/:key`
*   **Description:** Deletes a file identified by its S3 key from the AWS S3 bucket.
*   **Request:**
    *   URL parameter `:key` representing the S3 object key.
*   **Successful Response (200 OK):**
    ```json
    {
        "message": "File deleted successfully",
        "key": "unique-key-originalfilename.jpg"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: File key is missing.
    *   `404 Not Found`: File with the given key does not exist and cannot be deleted.
        ```json
        {
            "status": "error",
            "statusCode": 404,
            "message": "File not found, cannot delete."
        }
        ```
    *   `500 Internal Server Error`: Error during deletion from S3.

---

### Health Check

*   **Method:** `GET`
*   **Path:** `/health` (Note: this is relative to the service root, not `/api/files`)
*   **Description:** Checks the health status of the service.
*   **Successful Response (200 OK):**
    ```json
    {
        "status": "ok",
        "service": "file-service",
        "timestamp": "2023-10-27T10:00:00.000Z"
    }
    ```

## 3. Environment Variables

Create a `.env` file in the root of the `file-service` directory based on the `.env.example` file. The following variables are required:

*   `PORT`: The port on which the service will listen (e.g., `3001`).
*   `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID for S3 access.
*   `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key for S3 access.
*   `AWS_REGION`: The AWS region where your S3 bucket is located (e.g., `us-east-1`).
*   `BUCKET_NAME`: The name of the AWS S3 bucket where files will be stored.
*   `MAX_FILE_SIZE_MB`: Maximum allowed file size for uploads, in megabytes (e.g., `10`).
*   `ALLOWED_MIME_TYPES`: Comma-separated list of MIME types allowed for upload (e.g., `image/jpeg,image/png,application/pdf`).

## 4. Setup and Running Instructions (Local Development)

1.  **Clone the repository** (if applicable).
2.  **Navigate to the `file-service` directory:**
    ```bash
    cd path/to/your/project/file-service
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Create and configure your `.env` file:**
    Copy `.env.example` to `.env` and fill in your AWS credentials and other configurations.
    ```bash
    cp .env.example .env
    # Now edit .env with your details
    ```
5.  **Build the service (compile TypeScript):**
    ```bash
    npm run build
    ```
6.  **Run the service:**
    *   **Development mode (with auto-reloading via `nodemon`):**
        ```bash
        npm run dev
        ```
    *   **Production mode (after building):**
        ```bash
        npm start
        ```
    The service will typically be available at `http://localhost:<PORT>`.

## 5. Docker

1.  **Build the Docker image:**
    Ensure you are in the `file-service` directory where the `Dockerfile` is located.
    ```bash
    docker build -t file-service .
    ```
    (You can replace `file-service` with your preferred image name/tag).

2.  **Run the Docker container:**
    You need to provide the environment variables to the container. This can be done using an environment file (e.g., your `.env` file) or by specifying each variable individually.

    *   **Using an `--env-file`:**
        Make sure your `.env` file is up-to-date with all necessary variables.
        ```bash
        docker run -p 3001:3001 --env-file .env file-service
        ```
        Replace `<host_port>` (e.g., `3001`) with the port you want to access the service on your host machine, and `<container_port>` (e.g., `3001`, matching the `PORT` in your `.env` file) with the port the application runs on inside the container.

    *   **Specifying individual environment variables:**
        ```bash
        docker run -p 3001:3001 \
          -e PORT=3001 \
          -e AWS_ACCESS_KEY_ID="your_access_key" \
          -e AWS_SECRET_ACCESS_KEY="your_secret_key" \
          -e AWS_REGION="your_region" \
          -e BUCKET_NAME="your_bucket_name" \
          -e MAX_FILE_SIZE_MB="10" \
          -e ALLOWED_MIME_TYPES="image/jpeg,image/png" \
          file-service
        ```

    The service running inside the Docker container will be accessible at `http://localhost:<host_port>`.
