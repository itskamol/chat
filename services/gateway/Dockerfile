FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml first for better caching
COPY gateway/package*.json ./
COPY gateway/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy gateway source code
COPY gateway .

# Copy shared package if needed
COPY packages/shared ./node_modules/@chat/shared

# Build the application
RUN pnpm build

EXPOSE 8080

CMD ["pnpm", "run", "start"]