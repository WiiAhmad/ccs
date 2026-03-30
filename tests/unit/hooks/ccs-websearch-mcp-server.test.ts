import { describe, expect, it } from 'bun:test';
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const serverPath = join(process.cwd(), 'lib', 'mcp', 'ccs-websearch-server.cjs');

function encodeMessage(message: unknown): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function collectResponses(
  child: ReturnType<typeof spawn>,
  expectedCount: number
): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const responses: Array<Record<string, unknown>> = [];
    const timer = setTimeout(() => reject(new Error('Timed out waiting for MCP responses')), 5000);

    function tryParse(): void {
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          return;
        }

        const headerText = buffer.slice(0, headerEnd).toString('utf8');
        const match = headerText.match(/content-length:\s*(\d+)/i);
        if (!match) {
          reject(new Error('Missing Content-Length header'));
          return;
        }

        const contentLength = Number.parseInt(match[1], 10);
        const messageEnd = headerEnd + 4 + contentLength;
        if (buffer.length < messageEnd) {
          return;
        }

        const body = buffer.slice(headerEnd + 4, messageEnd).toString('utf8');
        buffer = buffer.slice(messageEnd);
        responses.push(JSON.parse(body) as Record<string, unknown>);

        if (responses.length >= expectedCount) {
          clearTimeout(timer);
          resolve(responses);
          return;
        }
      }
    }

    child.stdout.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        tryParse();
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.stderr.on('data', () => {
      // Ignore debug noise in tests.
    });
  });
}

describe('ccs-websearch MCP server', () => {
  it('lists the CCS search tool and returns provider-backed results', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ccs-websearch-mcp-server-'));
    const preloadPath = join(tempDir, 'mock-fetch.cjs');
    const html = `
      <a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com%2Farticle">Example title</a>
      <a class="result__snippet">Example snippet</a>
    `.trim();
    writeFileSync(
      preloadPath,
      `global.fetch = async () => ({ ok: true, text: async () => ${JSON.stringify(html)} });\n`,
      'utf8'
    );

    const child = spawn('node', ['-r', preloadPath, serverPath], {
      env: {
        ...process.env,
        CCS_PROFILE_TYPE: 'settings',
        CCS_WEBSEARCH_ENABLED: '1',
        CCS_WEBSEARCH_SKIP: '0',
        CCS_WEBSEARCH_BRAVE: '0',
        CCS_WEBSEARCH_DUCKDUCKGO: '1',
        CCS_WEBSEARCH_EXA: '0',
        CCS_WEBSEARCH_GEMINI: '0',
        CCS_WEBSEARCH_GROK: '0',
        CCS_WEBSEARCH_OPENCODE: '0',
        CCS_WEBSEARCH_TAVILY: '0',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    try {
      const responsesPromise = collectResponses(child, 3);
      child.stdin.write(
        encodeMessage({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'bun-test', version: '1.0.0' },
          },
        })
      );
      child.stdin.write(encodeMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
      child.stdin.write(
        encodeMessage({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'search', arguments: { query: 'btc price' } },
        })
      );

      const responses = await responsesPromise;
      const toolsList = responses.find((message) => message.id === 2);
      const toolCall = responses.find((message) => message.id === 3);

      expect(toolsList?.result).toEqual({
        tools: [
          {
            name: 'search',
            description:
              'Search the web through CCS-managed providers. Provider order: Exa, Tavily, Brave Search, DuckDuckGo, then optional legacy CLI fallback.',
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
        ],
      });
      expect(toolCall?.result).toBeDefined();
      expect(
        ((toolCall?.result as { content: Array<{ text: string }> }).content[0] || {}).text
      ).toContain('CCS local WebSearch evidence');
      expect(
        ((toolCall?.result as { content: Array<{ text: string }> }).content[0] || {}).text
      ).toContain('Provider: DuckDuckGo');
    } finally {
      child.kill();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('hides the tool for native account profiles', async () => {
    const child = spawn('node', [serverPath], {
      env: {
        ...process.env,
        CCS_PROFILE_TYPE: 'account',
        CCS_WEBSEARCH_ENABLED: '1',
        CCS_WEBSEARCH_SKIP: '1',
        CCS_WEBSEARCH_DUCKDUCKGO: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    try {
      const responsesPromise = collectResponses(child, 2);
      child.stdin.write(
        encodeMessage({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'bun-test', version: '1.0.0' },
          },
        })
      );
      child.stdin.write(encodeMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));

      const responses = await responsesPromise;
      const toolsList = responses.find((message) => message.id === 2);
      expect(toolsList?.result).toEqual({ tools: [] });
    } finally {
      child.kill();
    }
  });
});
