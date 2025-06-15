# MCP Server: Docker Command Runner

This MCP (Model Context Protocol) server provides a secure interface for running commands inside Docker containers. It acts as a privileged sidecar that can execute arbitrary commands within specified Docker Compose service containers.

## Features

- STDIO-based MCP transport for integration with Claude and other MCP clients
- Execute commands in any Docker Compose service container
- Real-time capture of stdout/stderr output
- Secure container allowlist configuration
- Configurable timeouts for long-running commands
- Clear error messages for common Docker issues
- Minimal dependencies and secure by design

## Installation

### Via NPX (Recommended)

Run the MCP server directly without cloning:

```bash
npx mcp-server-docker
```

Or install globally:

```bash
npm install -g mcp-server-docker
mcp-server-docker
```

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

- `ALLOWED_CONTAINERS`: Comma-separated list of allowed service:container pairs (e.g., "app:myapp_container,db:mydb_container")
- `DEFAULT_SERVICE`: Default service to run commands in (default: "laravel_app")
- `COMMAND_TIMEOUT`: Command timeout in milliseconds (default: 300000)

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

## Usage

The server uses STDIO transport for MCP communication. When run with `npx mcp-server-docker`, it will:

1. Parse environment variables for allowed containers
2. Start the MCP server listening on stdin/stdout
3. Log startup information to stderr
4. Wait for MCP protocol messages

## Security Notes

- This server requires access to the Docker socket - ensure Docker is running and accessible
- No command filtering is applied - relies on container isolation for security
- Commands timeout after 5 minutes by default
- Only allowed containers (configured via ALLOWED_CONTAINERS) can be accessed

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