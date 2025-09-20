FROM denoland/deno:debian-2.4.5

ARG VERSION=latest

LABEL version=$VERSION

# Install required packages
RUN apt-get update && apt-get install -y \
sqlite3 \
yt-dlp \
ffmpeg \
&& rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy version file
COPY VERSION ./

# Copy deno configuration files
COPY deno.json* ./
COPY deno.lock* ./

# Copy source code
COPY src/ ./src/

# Install opusscript as an alternative to @discordjs/opus
RUN deno cache --allow-scripts src/main.ts

# Store version in container for runtime access
RUN echo "Version: $VERSION" > /app/version.txt

# Command to run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--env=.env", "src/main.ts"]