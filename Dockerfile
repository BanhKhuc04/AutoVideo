FROM node:20-bullseye-slim

# Install system dependencies: python3, ffmpeg, curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy server source code
COPY server/ ./

# Build TypeScript to JavaScript
RUN npm run build

# Default environment variables
ENV PORT=5000
ENV NODE_ENV=production
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 5000

CMD ["npm", "start"]
