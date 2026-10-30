FROM node:26-slim AS build

WORKDIR /app

COPY package*.json tsconfig.json vite.config.ts ./

RUN npm ci

COPY src/ ./src/

RUN npm run build

RUN npm prune --omit=dev

FROM node:26-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g deno && npm cache clean --force

ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp /usr/local/bin/yt-dlp

RUN yt-dlp --update-to master

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/logs /app/downloads

ARG VERSION=dev
ENV VERSION=$VERSION

CMD ["node", "dist/main.js"]
