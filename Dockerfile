FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) for building
RUN npm ci

# Copy TypeScript configuration and source
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies after build to keep image smaller
RUN npm prune --production

# Install supergateway using npx
# We'll use npx to run it instead of installing globally

# Expose the HTTP port
EXPOSE 3000

# Run as root to access Docker socket
USER root

# Use npx to run supergateway to wrap the stdio server
ENTRYPOINT ["npx", "-y", "supergateway", "--stdio", "node /app/dist/index.js", "--port", "3000"]