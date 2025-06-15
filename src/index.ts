#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

// Parse allowed containers from environment variable
// Format: "service1:container1,service2:container2"
function parseAllowedContainers(): { [key: string]: string } {
  const allowedStr = process.env.ALLOWED_CONTAINERS || "";
  const containers: { [key: string]: string } = {};
  
  if (allowedStr) {
    const pairs = allowedStr.split(',');
    for (const pair of pairs) {
      const [service, container] = pair.split(':');
      if (service && container) {
        containers[service.trim()] = container.trim();
      }
    }
  }
  
  // Return default if no containers specified
  if (Object.keys(containers).length === 0) {
    console.error("Warning: No allowed containers specified in ALLOWED_CONTAINERS environment variable");
    return {
      "laravel_app": "laravel_app_dev"
    };
  }
  
  return containers;
}

const ALLOWED_CONTAINERS = parseAllowedContainers();
const DEFAULT_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT || "300000");
const DEFAULT_SERVICE = process.env.DEFAULT_SERVICE || "laravel_app";

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runDockerCommand(
  command: string,
  service?: string
): Promise<CommandResult> {
  const targetService = service || DEFAULT_SERVICE;
  
  // Check if the service is allowed
  if (!ALLOWED_CONTAINERS[targetService]) {
    throw new Error(`Service '${targetService}' is not allowed. Allowed services: ${Object.keys(ALLOWED_CONTAINERS).join(', ')}`);
  }
  
  const containerName = ALLOWED_CONTAINERS[targetService];
  
  // Build docker exec command
  const dockerArgs = ["exec", containerName, "sh", "-c", command];
  
  return new Promise((resolve, reject) => {
    // Use docker directly
    const dockerProcess = spawn("docker", dockerArgs);
    
    let stdout = "";
    let stderr = "";
    
    // Set timeout
    const timeout = setTimeout(() => {
      dockerProcess.kill();
      reject(new Error(`Command timed out after ${DEFAULT_TIMEOUT}ms`));
    }, DEFAULT_TIMEOUT);
    
    dockerProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    dockerProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    dockerProcess.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });
    
    dockerProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Create server instance
const server = new Server(
  {
    name: "mcp-server-docker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_command",
        description: "Execute a command inside a Docker container service",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to execute in the container",
            },
            service: {
              type: "string",
              description: `Docker Compose service name (optional, uses default: ${DEFAULT_SERVICE} if not specified)`,
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "run_command") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  
  const { command, service } = request.params.arguments as {
    command: string;
    service?: string;
  };
  
  if (!command) {
    throw new Error("Command is required");
  }
  
  try {
    const result = await runDockerCommand(command, service);
    
    // Format the response
    let response = "";
    
    if (result.stdout) {
      response += result.stdout;
    }
    
    if (result.stderr) {
      if (response) response += "\n\n";
      response += `[stderr]\n${result.stderr}`;
    }
    
    response += `\n\nExit code: ${result.exitCode}`;
    
    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide helpful error messages for common issues
    if (errorMessage.includes("No such service")) {
      throw new Error(
        `Service '${service || DEFAULT_SERVICE}' not found. Available services can be listed with 'docker compose ps'.`
      );
    } else if (errorMessage.includes("Cannot connect to the Docker daemon")) {
      throw new Error(
        "Cannot connect to Docker daemon. Ensure Docker is running and the socket is mounted."
      );
    } else if (errorMessage.includes("timed out")) {
      throw new Error(
        `Command timed out after ${DEFAULT_TIMEOUT / 1000} seconds. Consider running shorter commands or increasing the timeout.`
      );
    }
    
    throw new Error(`Failed to execute command: ${errorMessage}`);
  }
});

// Start the server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MCP Server Docker started");
  console.error(`Default service: ${DEFAULT_SERVICE}`);
  console.error(`Allowed containers: ${Object.keys(ALLOWED_CONTAINERS).join(', ')}`);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});