# Use Node.js 22 with Alpine for smaller image size
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml first for better caching
COPY ui/package*.json ./
COPY ui/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy UI source code
COPY ui .

# Build Next.js application
RUN pnpm build

# Expose port (default Next.js port)
EXPOSE 3000

# Start the application
CMD ["pnpm", "run", "start"]
