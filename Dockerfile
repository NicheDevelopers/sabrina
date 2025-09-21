FROM node:lts-alpine

ARG VERSION=$(npm pkg get version | tr -d '"')

LABEL version=$VERSION

# Update package lists and install system dependencies using Alpine's apk
RUN apk update && apk add --no-cache \
sqlite \
yt-dlp-core \
ffmpeg \
jq

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Create logs directory
RUN mkdir -p /app/logs

# Create downloads directory
RUN mkdir -p /app/downloads

# Copy .env file if it exists (for production)
COPY .env* ./

# Expose health check port
EXPOSE 8080

# Command to run the application
CMD ["npm", "start"]