#!/usr/bin/env node

// Simple test script to verify MCP server functionality
// Run with: node test-mcp.js

import { spawn } from 'child_process';

const mcpProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization request
const initRequest = {
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  },
  id: 1
};

// Send list tools request
const listToolsRequest = {
  jsonrpc: "2.0",
  method: "tools/list",
  params: {},
  id: 2
};

// Send tool call request
const toolCallRequest = {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "run_command",
    arguments: {
      command: "echo 'Hello from Docker!'",
      service: "laravel_app"
    }
  },
  id: 3
};

let buffer = '';

mcpProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not JSON, probably a log message
        console.log('Log:', line);
      }
    }
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`MCP process exited with code ${code}`);
});

// Send requests with delays
console.log('Sending initialization request...');
mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

setTimeout(() => {
  console.log('\nSending list tools request...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('\nSending tool call request...');
  mcpProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
}, 2000);

// Close after 5 seconds
setTimeout(() => {
  console.log('\nClosing connection...');
  mcpProcess.stdin.end();
}, 5000);