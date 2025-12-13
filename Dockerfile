FROM node:22

RUN apt-get update && apt-get install -y \
    sqlite3 \
    ffmpeg \
    jq \
    wget \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g deno

RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx yt-dlp \
    && mv yt-dlp /usr/local/bin/yt-dlp \
    && yt-dlp --update-to master

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/

RUN npm run build

RUN npm prune --production

RUN mkdir -p /app/logs

RUN mkdir -p /app/downloads

EXPOSE 8080

CMD ["node", "dist/main.js"]
