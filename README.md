# Sabrina

A Discord music bot that plays audio from YouTube with voice channel support.

## Roadmap

### v1.1
- [ ] Fix queue bugs
- [ ] Add more audio sources (Spotify, SoundCloud, etc.)
- [ ] More embeds and emojis
- [ ] Support for Polish language
- [ ] Add more commands (e.g., lyrics, shuffle, repeat)
- [ ] Improve logging

## Configuration

- **Version Management**: Version is automatically read from `package.json`
- **Database**: SQLite database (`sabrina.db`) for persistent data
- **Logging**: Logs are stored in the `logs/` directory
- **Downloads**: YouTube audio files cached in `downloads/youtube/`

## Health Check

The bot includes a health check endpoint accessible at:

- Development: `http://localhost:4747/health`
- Production: Configurable via `HEALTH_PORT` environment variable

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f nichebot

# Update and restart
git pull
docker-compose up -d --build
```

### Manual Docker Build

```bash
# Build image
docker build -t sabrina:latest .

# Run container
docker run -d \
  --name sabrina \
  --env-file .env \
  -v $(pwd)/downloads/youtube:/app/downloads/youtube \
  -v $(pwd)/sabrina.db:/app/sabrina.db \
  -v $(pwd)/logs:/app/logs \
  sabrina:latest
```
