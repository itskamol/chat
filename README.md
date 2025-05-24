# Real-time Chat Application

Modern real-time chat application built with microservices architecture using Node.js, Next.js, Socket.IO, and MongoDB.

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
my-chat-server/
├── gateway/          # API Gateway service
├── user-service/     # User management & authentication
├── chat-service/     # Real-time chat functionality
├── notification-service/ # Email notifications
├── ui/              # Next.js frontend application
└── nginx/           # Reverse proxy & load balancer
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
\`\`\`bash
git clone <repository-url>
cd my-chat-server
\`\`\`

2. Create .env files for each service:

**Gateway Service (.env)**
\`\`\`env
PORT=8080
JWT_SECRET=your_jwt_secret
\`\`\`

**User Service (.env)**
\`\`\`env
PORT=8081
MONGO_URI=mongodb://root:password@mongodb:27017/user-service-db?authSource=admin
JWT_SECRET=your_jwt_secret
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
\`\`\`

**Chat Service (.env)**
\`\`\`env
PORT=8082
MONGO_URI=mongodb://root:password@mongodb:27017/chat-service-db?authSource=admin
JWT_SECRET=your_jwt_secret
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
\`\`\`

**Notification Service (.env)**
\`\`\`env
PORT=8083
MESSAGE_BROKER_URL=amqp://guest:guest@rabbitmq:5672
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
EMAIL_FROM=chat-server@yourdomain.com
\`\`\`

**UI (.env.local)**
\`\`\`env
NEXT_PUBLIC_API_BASE_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/ws
\`\`\`

### Running the Application

1. Start all services:
\`\`\`bash
docker-compose up --build
\`\`\`

2. Access the application:
- Frontend: http://localhost
- API Gateway: http://localhost/api
- Websocket: ws://localhost/ws

### Development

For local development:

1. Install dependencies:
\`\`\`bash
# Install dependencies for all services
cd user-service && pnpm install
cd ../chat-service && pnpm install
cd ../notification-service && pnpm install
cd ../gateway && pnpm install
cd ../ui && pnpm install
\`\`\`

2. Run services individually:
\`\`\`bash
# Terminal 1 - User Service
cd user-service && pnpm dev

# Terminal 2 - Chat Service
cd chat-service && pnpm dev

# Terminal 3 - Notification Service
cd notification-service && pnpm dev

# Terminal 4 - Gateway
cd gateway && pnpm dev

# Terminal 5 - UI
cd ui && pnpm dev
\`\`\`

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
- \`userOnline\` - Emit when user connects
- \`sendMessage\` - Send new message
- \`typing\` - User typing status
- \`getOnlineUsers\` - Request online users list

### Server Events
- \`receiveMessage\` - New message received
- \`messageSent\` - Message sent confirmation
- \`userStatusChanged\` - User status updates
- \`onlineUsersList\` - List of online users
- \`userTyping\` - User typing indicator

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
\`\`\`bash
docker-compose -f docker-compose.prod.yml build
\`\`\`

3. Deploy containers:
\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## 📝 Testing

Run tests for each service:
\`\`\`bash
# User Service
cd user-service && pnpm test

# Chat Service
cd chat-service && pnpm test

# Notification Service
cd notification-service && pnpm test

# UI
cd ui && pnpm test
\`\`\`

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
