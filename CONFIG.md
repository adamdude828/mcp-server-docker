# MCP Docker Server Configuration

## Container Whitelist

The MCP Docker server uses a whitelist approach to restrict which containers can be accessed. This is configured via environment variables in `docker-compose.yml`.

### Environment Variables

The following environment variables configure the MCP server:

- `ALLOWED_CONTAINERS` - Comma-separated list of allowed service:container mappings
  - Format: `service1:container1,service2:container2`
  - Example: `laravel_app:laravel_app_dev,db:sqlserver_dev,redis:redis_dev`
- `DEFAULT_SERVICE` - The default service when none is specified (default: `laravel_app`)
- `COMMAND_TIMEOUT` - Command timeout in milliseconds (default: `300000` = 5 minutes)
- `PORT` - HTTP server port for supergateway (default: `3000`)

### Example Configuration

```yaml
environment:
  - DEFAULT_SERVICE=laravel_app
  - PORT=3000
  - ALLOWED_CONTAINERS=laravel_app:laravel_app_dev,db:sqlserver_dev,redis:redis_dev,mailhog:mailhog,nextjs_app:nextjs_app_dev
  - COMMAND_TIMEOUT=300000
```

### Adding/Removing Containers

To modify the whitelist:
1. Edit the `ALLOWED_CONTAINERS` environment variable in `docker-compose.yml`
2. Add or remove service:container pairs
3. Rebuild and restart the MCP server container

### Security

The whitelist ensures:
- Only explicitly allowed containers can be accessed
- System containers (claude_runner, mcp_docker) should not be included
- No access to other containers on the Docker host
- If no containers are specified, only `laravel_app:laravel_app_dev` is allowed by default

## After Configuration Changes

The MCP server container must be rebuilt and restarted after any configuration changes to the Dockerfile or source code. Environment variable changes only require a container restart.