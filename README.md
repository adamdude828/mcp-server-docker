# MCP Server: Docker Command Runner

This MCP (Model Context Protocol) server provides a secure HTTP-based interface for running commands inside Docker containers. It acts as a privileged sidecar that can execute arbitrary commands within specified Docker Compose service containers.

## Features

- HTTP/SSE-based transport for inter-container communication
- Execute commands in any Docker Compose service container
- Real-time streaming of stdout/stderr output
- Session management for multiple concurrent clients
- Configurable timeouts for long-running commands
- Clear error messages for common Docker issues
- Minimal dependencies and secure by design

## Installation

### As a Docker Service

Add the following to your `docker-compose.yml`:

```yaml
services:
  mcp-docker:
    build: ./mcp-server-docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - "3001:3000"  # Expose MCP server
    environment:
      - COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}
      - DEFAULT_SERVICE=app
      - COMPOSE_FILE=docker-compose.yml
      - PORT=3000
    networks:
      - your-network
```

### For Local Development

```bash
cd mcp-server-docker
npm install
npm run build
```

## Configuration

The server accepts the following environment variables:

- `COMPOSE_PROJECT_NAME`: Docker Compose project name (optional)
- `DEFAULT_SERVICE`: Default service to run commands in (default: "app")
- `COMPOSE_FILE`: Path to docker-compose.yml (optional)
- `PORT`: HTTP server port (default: 3000)

## MCP Tool: run_command

The server exposes a single tool called `run_command`:

### Input Schema

```json
{
  "command": "string (required) - The command to execute",
  "service": "string (optional) - Docker service name"
}
```

### Example Usage

```json
{
  "command": "npm test",
  "service": "frontend"
}
```

### Response Format

The tool returns the command output with the following structure:
- Standard output (if any)
- Standard error (if any, prefixed with [stderr])
- Exit code

## HTTP Endpoints

The server exposes the following HTTP endpoints:

- `POST /mcp` - Main MCP protocol endpoint for client requests
- `GET /mcp` - SSE endpoint for server-to-client notifications
- `DELETE /mcp/:sessionId` - Terminate a session
- `GET /health` - Health check endpoint

## Security Notes

- This server has access to the Docker socket - ensure it's only accessible within the Docker network
- No command filtering is applied - relies on container isolation for security
- Runs as non-root user inside the container
- Commands timeout after 5 minutes by default
- HTTP server binds to 0.0.0.0 to allow container-to-container communication

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

## Troubleshooting

### Common Errors

1. **"Cannot connect to Docker daemon"**: Ensure Docker is running and the socket is mounted
2. **"Service not found"**: Check that the service name exists in your docker-compose.yml
3. **"Command timed out"**: Command exceeded 5-minute timeout, consider breaking it into smaller operations