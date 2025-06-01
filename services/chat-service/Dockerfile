FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy workspace configuration first
COPY pnpm-workspace.yaml* ./
COPY package.json ./

# Copy all package.json files for workspace resolution
COPY services/chat-service/package*.json ./services/chat-service/
COPY packages/shared/package*.json ./packages/@chat/shared/

# Copy pnpm-lock.yaml from root
COPY pnpm-lock.yaml* ./

# Install dependencies for the entire workspace
RUN pnpm install --no-frozen-lockfile

# Copy service source code
COPY services/chat-service ./services/chat-service/

RUN pnpm --filter ./packages/shared build 

COPY packages/shared ./packages/@chat/shared/

# Build the application from the workspace root using pnpm filter
RUN pnpm --filter ./services/chat-service build

# Change to service directory for runtime
WORKDIR /usr/src/app/services/chat-service

EXPOSE 8082

CMD ["pnpm", "run", "start"]