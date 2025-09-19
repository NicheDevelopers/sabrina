# Use the official Deno image as base
FROM denoland/deno:alpine-2.4.5

# Build argument for version
ARG VERSION=latest

# Label with version
LABEL version=$VERSION

RUN apk add --no-cache sqlite

RUN apk -U add yt-dlp-core

# Set working directory
WORKDIR /app

# Copy version file
COPY VERSION ./

# Copy deno configuration files
COPY deno.json* .

# Copy source code
COPY src/ ./src/

# Cache the dependencies
RUN deno cache src/main.ts

# Store version in container for runtime access
RUN echo "Version: $VERSION" > /app/version.txt

# Command to run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--env=.env", "src/main.ts"]