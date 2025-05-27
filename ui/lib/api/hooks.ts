import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from './apiClient';
import type { APIError } from '@/lib/types';

interface UseApiOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: APIError) => void;
    initialData?: T;
    manual?: boolean;
    deps?: any[];
    retryCount?: number;
    retryDelay?: number;
}

export function useApi<T, P = void>(
    fetcher: (params: P) => Promise<T>,
    options: UseApiOptions<T> = {}
) {
    const {
        initialData,
        onSuccess,
        onError,
        manual = false,
        deps = [],
        retryCount = 3,
        retryDelay = 1000,
    } = options;

    const [data, setData] = useState<T | undefined>(initialData);
    const [isLoading, setIsLoading] = useState(!manual);
    const [error, setError] = useState<APIError | null>(null);
    const [retries, setRetries] = useState(0);

    const execute = useCallback(
        async (params?: P) => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await fetcher(params as P);
                setData(result);
                onSuccess?.(result);
                setRetries(0);
                return result;
            } catch (err) {
                const apiError = err as APIError;
                setError(apiError);

                // Handle retry logic
                if (retries < retryCount) {
                    setTimeout(() => {
                        setRetries((r) => r + 1);
                        execute();
                    }, retryDelay * Math.pow(2, retries));
                    return;
                }

                onError?.(apiError);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: apiError.message || 'An error occurred',
                });
                throw apiError;
            } finally {
                setIsLoading(false);
            }
        },
        [...deps, retries]
    );

    useEffect(() => {
        if (!manual) {
            execute();
        }
    }, [execute, manual]);

    return {
        data,
        isLoading,
        error,
        execute,
        setData,
    };
}

// Pre-configured hooks for common operations
export function useMessages(receiverId: string) {
    return useApi(() => apiClient.getMessages(receiverId), {
        deps: [receiverId],
    });
}

export function useContacts() {
    return useApi(() => apiClient.getContacts());
}

export function useSendMessage() {
    return useApi(
        ({ receiverId, message }: { receiverId: string; message: string }) =>
            apiClient.sendMessage(receiverId, message)
    );
}

export function useUploadFile() {
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const upload = useCallback(async (file: File, receiverId: string) => {
        try {
            const result = await apiClient.uploadFile(
                file,
                receiverId,
                (progress) => {
                    setUploadProgress(progress);
                }
            );
            return result;
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Failed to upload file',
            });
            throw error;
        } finally {
            setUploadProgress(0);
        }
    }, []);

    return { upload, uploadProgress };
}
