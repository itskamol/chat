# Use an appropriate Node.js base image
FROM node:22-alpine

# Install pnpm globally and build dependencies required for mediasoup including Linux headers
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    libc-dev \
    linux-headers && \
    npm install -g pnpm

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml first for better caching
COPY services/media-service/package*.json ./
COPY services/media-service/pnpm-lock.yaml* ./

# Install all dependencies (including dev dependencies for building)
RUN pnpm install

# Copy service source code
COPY services/media-service .

# Copy shared package if needed
COPY packages/shared ./node_modules/shared

# Build the TypeScript application
RUN pnpm build

# Remove dev dependencies to reduce image size (but keep build tools for mediasoup)
RUN pnpm prune --prod

# Expose the server port
EXPOSE 8085

# Define the CMD to run the application
CMD ["pnpm", "run", "start"]