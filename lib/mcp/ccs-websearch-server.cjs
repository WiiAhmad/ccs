#!/usr/bin/env node

const {
  hasAnyActiveProviders,
  runLocalWebSearch,
  shouldSkipHook,
} = require('../hooks/websearch-transformer.cjs');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'ccs-websearch';
const SERVER_VERSION = '1.0.0';
const TOOL_NAME = 'search';
const TOOL_DESCRIPTION =
  'Search the web through CCS-managed providers. Provider order: Exa, Tavily, Brave Search, DuckDuckGo, then optional legacy CLI fallback.';

let inputBuffer = Buffer.alloc(0);

function shouldExposeTools() {
  return !shouldSkipHook() && hasAnyActiveProviders();
}

function getTools() {
  if (!shouldExposeTools()) {
    return [];
  }

  return [
    {
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to run against CCS WebSearch providers.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ];
}

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}

function writeResponse(id, result) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    result,
  });
}

function writeError(id, code, message) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  });
}

async function handleToolCall(message) {
  const id = message.id;
  const params = message.params || {};
  const toolArgs = params.arguments || {};

  if (params.name !== TOOL_NAME) {
    writeError(id, -32602, `Unknown tool: ${params.name || '<missing>'}`);
    return;
  }

  if (!shouldExposeTools()) {
    writeResponse(id, {
      content: [
        {
          type: 'text',
          text: 'CCS WebSearch is unavailable for this profile or no providers are ready.',
        },
      ],
      isError: true,
    });
    return;
  }

  const query = typeof toolArgs.query === 'string' ? toolArgs.query.trim() : '';
  if (!query) {
    writeError(id, -32602, 'Tool "search" requires a non-empty string query.');
    return;
  }

  const result = await runLocalWebSearch(query);
  if (result.success) {
    writeResponse(id, {
      content: [{ type: 'text', text: result.content }],
    });
    return;
  }

  const errorDetail =
    result.noActiveProviders || result.errors.length === 0
      ? 'No active WebSearch providers are ready.'
      : result.errors.map((entry) => `${entry.provider}: ${entry.error}`).join(' | ');

  writeResponse(id, {
    content: [
      {
        type: 'text',
        text: `CCS local WebSearch failed for "${query}". ${errorDetail}`,
      },
    ],
    isError: true,
  });
}

async function handleMessage(message) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return;
  }

  switch (message.method) {
    case 'initialize':
      writeResponse(message.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      });
      return;
    case 'notifications/initialized':
      return;
    case 'ping':
      writeResponse(message.id, {});
      return;
    case 'tools/list':
      writeResponse(message.id, { tools: getTools() });
      return;
    case 'tools/call':
      await handleToolCall(message);
      return;
    default:
      if (message.id !== undefined) {
        writeError(message.id, -32601, `Method not found: ${message.method}`);
      }
  }
}

function parseMessages() {
  while (true) {
    const headerEnd = inputBuffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      return;
    }

    const headerText = inputBuffer.slice(0, headerEnd).toString('utf8');
    const contentLengthMatch = headerText.match(/content-length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      inputBuffer = Buffer.alloc(0);
      return;
    }

    const contentLength = Number.parseInt(contentLengthMatch[1], 10);
    const messageEnd = headerEnd + 4 + contentLength;
    if (inputBuffer.length < messageEnd) {
      return;
    }

    const body = inputBuffer.slice(headerEnd + 4, messageEnd).toString('utf8');
    inputBuffer = inputBuffer.slice(messageEnd);

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      continue;
    }

    Promise.resolve(handleMessage(message)).catch((error) => {
      if (message && message.id !== undefined) {
        writeError(message.id, -32603, (error && error.message) || 'Internal error');
      }
    });
  }
}

process.stdin.on('data', (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  parseMessages();
});

process.stdin.on('error', () => {
  process.exit(0);
});

process.stdin.resume();
