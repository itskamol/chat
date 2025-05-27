import { ApiError } from 'next/dist/server/api-utils';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  withAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, withAuth = true } = options;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: withAuth ? 'include' : 'omit',
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      withAuth: false,
    });
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      withAuth: false,
    });
  }

  // Message methods
  async getMessages(receiverId: string, page = 1, limit = 50) {
    return this.request(`/messages/get/${receiverId}?page=${page}&limit=${limit}`);
  }

  async sendMessage(receiverId: string, message: string) {
    return this.request('/messages/send', {
      method: 'POST',
      body: { receiverId, message },
    });
  }

  // File upload method with progress tracking
  async uploadFile(
    file: File,
    receiverId: string,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData();
    formData.append('mediaFile', file);
    formData.append('receiverId', receiverId);

    try {
      const xhr = new XMLHttpRequest();
      
      const promise = new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded * 100) / event.total);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new ApiError(xhr.status, xhr.statusText));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new ApiError(xhr.status, 'Network error occurred'));
        });
      });

      xhr.open('POST', `${this.baseUrl}/messages/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);

      return promise;
    } catch (error) {
      throw new ApiError(500, error instanceof Error ? error.message : 'Upload failed');
    }
  }

  // Contact methods
  async getContacts() {
    return this.request<any[]>('/users/contacts');
  }

  // Add other API methods as needed...
}

export const apiClient = new ApiClient();
