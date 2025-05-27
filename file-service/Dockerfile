# Stage 1: Builder
FROM node:18-slim AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Prune development dependencies
RUN npm prune --omit=dev


# Stage 2: Runner
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy necessary files from the builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the application runs on.
# This should match the PORT in your .env file or config.
# The actual port mapping is done during `docker run`.
EXPOSE 3001

# Define the command to run the application
CMD ["node", "dist/index.js"]
