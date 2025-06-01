import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

const filePath = path.join(process.cwd(), 'env', '.env'); // Adjusted to match the directory structure
// Determine the correct path to .env file based on current environment
const envPath =
    process.env.NODE_ENV === 'development'
        ? `${filePath}.local`
        : `${filePath}.production`;

dotenv.config({ path: envPath });

export const config = {
    // Server configuration
    server: {
        port: process.env.PORT,
    },
    // Mediasoup configuration
    mediasoup: {
        // Worker settings
        worker: {
            logLevel: 'warn' as const, // Mediasoup LogLevel
            logTags: [
                'info' as const,
                'ice' as const,
                'dtls' as const,
                'rtp' as const,
                'srtp' as const,
                'rtcp' as const,
            ],
            rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT) || 40000,
            rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT) || 49999,
        },
        // Router settings
        router: {
            mediaCodecs: [
                {
                    kind: 'audio' as const,
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video' as const,
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video' as const,
                    mimeType: 'video/H264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '42e01f',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000,
                    },
                },
            ],
        },
        // WebRTC transport settings
        webRtcTransport: {
            listenInfos: [
                // Changed from listenIps to listenInfos
                {
                    protocol: 'udp',
                    ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
                    announcedAddress:
                        process.env.MEDIASOUP_ANNOUNCED_IP || getAnnouncedIp(), // Changed from announcedIp
                },
                {
                    protocol: 'tcp',
                    ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
                    announcedAddress:
                        process.env.MEDIASOUP_ANNOUNCED_IP || getAnnouncedIp(), // Changed from announcedIp
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
            minimumAvailableOutgoingBitrate: 600000,
            maxSctpMessageSize: 262144, // Default value
        },
    },
};

function getAnnouncedIp(): string | undefined {
    // Attempt to find a public IP address, otherwise fallback to a local one
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const ifaceDetails = interfaces[name];
        if (ifaceDetails) {
            for (const iface of ifaceDetails) {
                // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }
    // If no public IP found, try to find a local one for development
    for (const name of Object.keys(interfaces)) {
        const ifaceDetails = interfaces[name];
        if (ifaceDetails) {
            for (const iface of ifaceDetails) {
                if (iface.family === 'IPv4' && iface.internal) {
                    return iface.address; // e.g. 127.0.0.1
                }
            }
        }
    }
    return undefined;
}
