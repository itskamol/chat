# Real-time Chat Application

Modern real-time chat application built with microservices architecture using Node.js, Next.js, Socket.IO, MongoDB, and WebRTC for video/audio calls.

## 🚀 Features

- **Real-time Messaging**
  - Instant message delivery
  - Message status (sent, delivered)
  - Typing indicators
  - Online/Offline status

- **User Management**
  - Authentication with JWT
  - User registration & login
  - Contact list management
  - User online status

- **Modern UI/UX**
  - Responsive design
  - Dark/Light mode
  - Real-time updates
  - Message history

## 🏗️ Architecture

The application follows a microservices architecture with the following components:

```
chat-app/
├── gateway/              # API Gateway service
├── user-service/         # User management & authentication
├── chat-service/         # Real-time chat functionality
├── notification-service/ # Email notifications
├── ui/                   # Next.js frontend application
└── nginx/                # Reverse proxy & load balancer
```

## 🛠️ Tech Stack

- **Backend**
  - Node.js & TypeScript
  - Express.js
  - Socket.IO
  - MongoDB
  - RabbitMQ (Message Broker)
  - JWT Authentication

- **Frontend**
  - Next.js 13+
  - TypeScript
  - TailwindCSS
  - Socket.IO Client
  - Shadcn UI Components

- **Infrastructure**
  - Docker & Docker Compose
  - Nginx
  - Microservices Architecture

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- pnpm (Package Manager)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd my-chat-server
```

2. Create .env files for each service:

**Gateway Service (.env)**
```env
PORT=8080
JWT_SECRET=your_jwt_secret
```

**User Service (.env)**
```env
PORT=8081
MONGO_URI=mongodb://root:password@mongodb:27017/user-service-db?authSource=admin
JWT_SECRET=your_jwt_secret
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
```

**Chat Service (.env)**
```env
PORT=8082
MONGO_URI=mongodb://root:password@mongodb:27017/chat-service-db?authSource=admin
JWT_SECRET=your_jwt_secret
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
```

**Notification Service (.env)**
```env
PORT=8083
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
EMAIL_FROM=chat-server@yourdomain.com
```

**UI (.env.local)**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/ws
NEXT_PUBLIC_TURN_SERVER_URL=turn:localhost:3478
NEXT_PUBLIC_TURN_SERVER_USERNAME=turnuser
NEXT_PUBLIC_TURN_SERVER_PASSWORD=turnpassword

# Media Server (if defaults in media-service/src/config.ts are not used or need override)
# These are typically set in docker-compose.yml for the media-service service
# MEDIA_SERVER_PORT=8085
# MEDIA_SERVER_MEDIASOUP_LISTEN_IP=0.0.0.0
# MEDIA_SERVER_MEDIASOUP_ANNOUNCED_IP=127.0.0.1 # CRITICAL: See notes below
# MEDIA_SERVER_MEDIASOUP_RTP_MIN_PORT=20000
# MEDIA_SERVER_MEDIASOUP_RTP_MAX_PORT=20020
# MEDIA_SERVER_DEBUG=mediasoup:*
```

**Important Notes on Environment Variables:**

*   A comprehensive list of all environment variables used by `docker-compose` can be found in the root `.env.example` file. Create a `.env` file by copying `.env.example` and customize it as needed.
*   **`MEDIASOUP_ANNOUNCED_IP` (for `media-service` service):**
    *   This is crucial for WebRTC to work correctly.
    *   **For local development (testing on the same machine where Docker is running):** `127.0.0.1` is usually correct if you access the UI via `http://localhost:3000`.
    *   **For testing from other devices on your LAN:** Set this to your host machine's LAN IP address (e.g., `192.168.1.100`).
    *   **For production:** This **must** be the public IP address of the server where the `media-service` is running.
*   **`NEXT_PUBLIC_TURN_SERVER_URL` (for `ui` service):**
    *   For local development, `turn:localhost:3478` works when `turn_server` is running and its port 3478 is mapped to the host.
    *   If testing from other devices on LAN, change `localhost` to your host machine's LAN IP.
    *   For production, this should be `turn:YOUR_PUBLIC_IP:3478` (or `turns:` if using TLS, which would require additional Nginx/coturn configuration).
*   **`turnserver.conf` (`external-ip` setting):**
    *   The `turn_config/turnserver.conf` file has an `external-ip` setting commented out.
    *   For local Docker setups where clients connect via `localhost` or host LAN IP, coturn can often auto-detect the correct external IP to advertise to clients.
    *   If you encounter NAT issues, or for production, you might need to uncomment and set `external-ip` in `turnserver.conf` to the host's public IP. If you set it, ensure the `relay-ip` is also set to the container's internal IP if necessary (though often not needed if `listening-ip` is `0.0.0.0`).

### Running the Application

1. Start all services:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost
- API Gateway: http://localhost/api
- Websocket: ws://localhost/ws

### Development

For local development:

1. Install dependencies:
```bash
# Install dependencies for all services
cd user-service && npm install
cd ../chat-service && npm install
cd ../notification-service && npm install
cd ../gateway && npm install
cd ../ui && npm install
```

2. Run services individually:
```bash
# Terminal 1 - User Service
cd user-service && npm run dev

# Terminal 2 - Chat Service
cd chat-service && npm run dev

# Terminal 3 - Notification Service
cd notification-service && npm run dev

# Terminal 4 - Gateway
cd gateway && npm run dev

# Terminal 5 - UI
cd ui && npm run dev
```

## 📦 API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Users
- GET `/api/users/contacts` - Get user contacts
- GET `/api/users/:id` - Get user profile

### Messages
- GET `/api/messages/get/:receiverId` - Get chat history
- POST `/api/messages/send` - Send message

## 🔌 WebSocket Events

### Client Events
- `userOnline` - Emit when user connects
- `sendMessage` - Send new message
- `typing` - User typing status
- `getOnlineUsers` - Request online users list

### Server Events
- `receiveMessage` - New message received
- `messageSent` - Message sent confirmation
- `userStatusChanged` - User status updates
- `onlineUsersList` - List of online users
- `userTyping` - User typing indicator

## 🔒 Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- Secure WebSocket connections
- Environment variables for sensitive data

## 🚀 Deployment

1. Configure environment variables for production
2. Build Docker images:
```bash
docker-compose -f docker-compose.yml build
```

3. Deploy containers:
```bash
docker-compose -f docker-compose.yml up -d
```

## 📈 Monitoring

- MongoDB status: http://localhost:27017
- RabbitMQ Management: http://localhost:15672
- Nginx status: http://localhost/nginx_status

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Author Name - Initial work & maintenance

## 🙏 Acknowledgments

- Socket.IO documentation
- Next.js documentation
- MongoDB documentation
- Docker documentation
