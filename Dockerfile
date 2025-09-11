# Use the official Deno image as base
FROM denoland/deno:2.4.5

# Set working directory
WORKDIR /app

# Copy deno configuration files
COPY deno.json* .

# Copy source code
COPY src/ ./src/

# Cache the dependencies
RUN deno cache src/main.ts

# Command to run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--env=.env", "src/main.ts"]