# Use an appropriate Node.js base image
FROM node:18-alpine

# Install build dependencies required for mediasoup including Linux headers
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    libc-dev \
    linux-headers

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy the source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Remove dev dependencies to reduce image size (but keep build tools for mediasoup)
RUN npm prune --production

# Expose the server port
EXPOSE 3001

# Define the CMD to run the application
CMD ["npm", "run", "start"]