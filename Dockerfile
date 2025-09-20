FROM denoland/deno:debian-2.4.5

ARG VERSION=latest

LABEL version=$VERSION

# Install Node.js and required packages
RUN apt-get update && apt-get install -y \
curl \
sqlite3 \
yt-dlp \
python3 \
make \
g++ \
build-essential \
&& curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
&& apt-get install -y nodejs \
&& npm install -g node-gyp \
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

# Cache the dependencies with allow-scripts for npm packages that need it
RUN deno cache --allow-scripts=npm:@discordjs/opus@0.10.0 src/main.ts

# Store version in container for runtime access
RUN echo "Version: $VERSION" > /app/version.txt

# Command to run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--env=.env", "src/main.ts"]