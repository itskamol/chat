import axios from 'axios';
import { logger } from '../utils';
import { MediaServerApiEndpoints } from '../types/signaling.types';
import { DtlsParameters, RtpCapabilities, RtpParameters } from '../types/signaling.types';

export class MediaServerClient {
    public async getRouterRtpCapabilities(roomId: string): Promise<RtpCapabilities> {
        try {
            const response = await axios.get(MediaServerApiEndpoints.getRouterRtpCapabilities(roomId));
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data as RtpCapabilities;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error getting RouterRtpCapabilities for room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error getting RouterRtpCapabilities for room ${roomId}:`, error);
            }
            throw error;
        }
    }

    public async createTransport(roomId: string, producing: boolean, consuming: boolean, sctpCapabilities?: any) {
        try {
            const response = await axios.post(
                MediaServerApiEndpoints.createTransport(roomId),
                { producing, consuming, sctpCapabilities },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error creating transport for room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error creating transport for room ${roomId}:`, error);
            }
            throw error;
        }
    }

    public async connectTransport(roomId: string, transportId: string, dtlsParameters: DtlsParameters) {
        try {
            const response = await axios.post(
                MediaServerApiEndpoints.connectTransport(roomId, transportId),
                { dtlsParameters },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error connecting transport ${transportId} in room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error connecting transport ${transportId} in room ${roomId}:`, error);
            }
            throw error;
        }
    }

    public async produce(roomId: string, transportId: string, kind: 'audio' | 'video', rtpParameters: RtpParameters, appData?: any) {
        try {
            const response = await axios.post(
                MediaServerApiEndpoints.produce(roomId, transportId),
                { kind, rtpParameters, appData },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data as { id: string };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error producing ${kind} for transport ${transportId} in room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error producing ${kind} for transport ${transportId} in room ${roomId}:`, error);
            }
            throw error;
        }
    }

    public async consume(roomId: string, transportId: string, producerId: string, rtpCapabilities: RtpCapabilities, consumingUserId: string) {
        try {
            const response = await axios.post(
                MediaServerApiEndpoints.consume(roomId, transportId),
                { producerId, rtpCapabilities, consumingUserId },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error consuming producer ${producerId} in room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error consuming producer ${producerId} in room ${roomId}:`, error);
            }
            throw error;
        }
    }

    public async closeProducer(roomId: string, producerId: string) {
        try {
            const response = await axios.post(MediaServerApiEndpoints.closeProducer(roomId, producerId));
            if (response.status !== 200) {
                throw new Error(`Media server error: ${response.data}`);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error closing producer ${producerId} in room ${roomId}:`, error.response?.data || error.message);
            } else {
                logger.error(`Error closing producer ${producerId} in room ${roomId}:`, error);
            }
            throw error;
        }
    }
}
