FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml first for better caching
COPY services/notification-service/package*.json ./
COPY services/notification-service/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy service source code
COPY services/notification-service .

# Copy shared package if needed
COPY packages/shared ./node_modules/@chat/shared

# Build the application
RUN pnpm build

EXPOSE 8083

CMD ["pnpm", "run", "start"]