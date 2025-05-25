# Use an appropriate Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application code (compiled dist folder and node_modules)
# Assuming your tsconfig.json outputs to a 'dist' folder
COPY dist ./dist
COPY node_modules ./node_modules

# Expose the server port (make sure this matches the port in your config.ts or .env)
EXPOSE 3001

# Define the CMD to run the application
CMD ["node", "dist/app.js"]
