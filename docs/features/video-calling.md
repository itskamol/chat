# Video Calling Feature

## Overview

The video calling feature enables real-time audio, video communication, and screen sharing among users within a chat context. It leverages a Selective Forwarding Unit (SFU) architecture using Mediasoup for efficient media stream routing.

## Services Involved / Architecture

The video calling functionality is distributed across several microservices:

1.  **UI (`ui` service):**
    *   Handles the client-side experience for video calls.
    *   Captures local audio/video/screen share using browser WebRTC APIs.
    *   Manages the local Mediasoup client device, transports, producers, and consumers.
    *   Communicates with the `chat-service` via Socket.IO for signaling.
    *   Renders video tiles, controls (mute, camera on/off, screen share, hang up), and call status.

2.  **Chat Service (`chat-service`):**
    *   Acts as the primary signaling server for WebRTC.
    *   Manages room creation/membership for video calls.
    *   Relays signaling messages between clients.
    *   Communicates with the `media-service`'s HTTP API to manage server-side WebRTC resources (routers, transports, producers, consumers) on behalf of clients.

3.  **Media Server (`media-service`):**
    *   The core SFU, built using Mediasoup.
    *   Responsible for receiving media streams from clients and forwarding them to other clients in the same room.
    *   Manages Mediasoup workers, routers, WebRTC transports, producers, and consumers.
    *   Exposes an HTTP API for the `chat-service` to control these resources.

4.  **TURN Server (`turn_server`):**
    *   A Coturn server providing STUN (Session Traversal Utilities for NAT) and TURN (Traversal Using Relays around NAT) services.
    *   Essential for clients behind restrictive NATs or firewalls to establish peer-to-peer (or peer-to-SFU) connections.

## Configuration (Key Environment Variables)

Correct configuration is crucial for the video calling feature to work.

### `media-service` service:
*(Typically set in `.env` at the project root and used by `docker-compose.yml`)*
```env
# Port the media-service listens on
PORT=3001

# IP address for Mediasoup to listen on (usually 0.0.0.0 in Docker)
MEDIASOUP_LISTEN_IP=0.0.0.0

# CRITICAL: The IP address announced to clients for media connections.
# - For local development (browser on same machine as Docker): 127.0.0.1
# - For LAN testing (browser on different device on same LAN): Host machine's LAN IP (e.g., 192.168.1.100)
# - For production: Server's public IP address.
MEDIASOUP_ANNOUNCED_IP=127.0.0.1

# UDP port range for Mediasoup RTP media streams
MEDIASOUP_RTP_MIN_PORT=20000
MEDIASOUP_RTP_MAX_PORT=20020

# Enable Mediasoup debugging logs (optional)
DEBUG=mediasoup:*
```

### `turn_server` service:
*(Configuration is primarily in `turn_config/turnserver.conf`)*
Key settings in `turnserver.conf`:
```
listening-port=3478
tls-listening-port=5349 # If TLS is used
realm=yourdomain.com
user=turnuser:turnpassword
log-file=/dev/stdout # For Docker logging
# external-ip=YOUR_SERVER_PUBLIC_IP # May need to be set explicitly in some environments
```

### `ui` service:
*(Typically set in `ui/.env.local` or as build-time environment variables)*
```env
# URL for the TURN server, accessible by client browsers
NEXT_PUBLIC_TURN_SERVER_URL=turn:localhost:3478 # Or turn:YOUR_PUBLIC_IP:3478

# Credentials for the TURN server
NEXT_PUBLIC_TURN_SERVER_USERNAME=turnuser
NEXT_PUBLIC_TURN_SERVER_PASSWORD=turnpassword
```

### `chat-service` service:
*(Typically set in `.env` at the project root and used by `docker-compose.yml`)*
```env
# URL for the chat-service to communicate with the media-service
MEDIA_SERVER_URL=http://media_server_container:8085
```

## Signaling Flow (Simplified)

1.  **Join Room:** Client A sends `joinRoom` to `chat-service`.
2.  **Router Capabilities:** Client A requests router RTP capabilities from `chat-service`, which fetches them from `media-service`'s `/rooms/:roomId/router-rtp-capabilities` API.
3.  **Load Device:** Client A loads its Mediasoup device with the router capabilities.
4.  **Create Transports:** Client A requests `createWebRtcTransport` from `chat-service` for send and receive transports. `chat-service` calls `media-service`'s `/rooms/:roomId/transports` API.
5.  **Connect Transports:** Client A's Mediasoup transport emits a `connect` event. DTLS parameters are sent via `connectWebRtcTransport` to `chat-service`, which then calls `media-service`'s `/rooms/:roomId/transports/:transportId/connect` API.
6.  **Produce Media:**
    *   Client A's Mediasoup send transport emits a `produce` event when local media (webcam/mic/screen) is ready.
    *   Client A sends `produce` (or `startScreenShare`) to `chat-service` with media kind, RTP parameters, and appData.
    *   `chat-service` calls `media-service`'s `/rooms/:roomId/transports/:transportId/produce` API.
    *   `media-service` creates a server-side producer and returns its ID.
    *   `chat-service` broadcasts `newProducer` to other clients in the room.
7.  **Consume Media:**
    *   Client B receives `newProducer` for Client A's media.
    *   Client B requests `consume` from `chat-service`, providing its RTP capabilities and the `producerId` to consume.
    *   `chat-service` calls `media-service`'s `/rooms/:roomId/transports/:transportId/consume` API.
    *   `media-service` creates a server-side consumer and returns its parameters (ID, kind, RTP parameters).
    *   Client B receives these parameters and creates a local Mediasoup consumer to receive and play the media track.
8.  **Leaving/Cleanup:** When a user leaves or disconnects, `chat-service` ensures associated producers are closed on the `media-service` via the `/rooms/:roomId/producers/:producerId` (DELETE) API. Transports may also be closed if no longer needed.

This flow enables clients to exchange media through the SFU (`media-service`), with signaling orchestrated by the `chat-service`.
```
