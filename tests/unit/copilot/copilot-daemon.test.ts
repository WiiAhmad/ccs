import { afterEach, describe, expect, it } from 'bun:test';
import * as http from 'http';
import { isDaemonRunning } from '../../../src/copilot/copilot-daemon';

const activeServers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
});

async function createServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) => void
): Promise<number> {
  const server = http.createServer(handler);
  activeServers.push(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve server port');
  }

  return address.port;
}

describe('copilot daemon health detection', () => {
  it('returns false when no daemon is running on port', async () => {
    const running = await isDaemonRunning(19998);
    expect(running).toBe(false);
  });

  it('returns true when daemon root endpoint confirms server is running', async () => {
    const port = await createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Server running');
    });

    const running = await isDaemonRunning(port);
    expect(running).toBe(true);
  });

  it('returns false when root endpoint returns 200 but unexpected body', async () => {
    const port = await createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });

    const running = await isDaemonRunning(port);
    expect(running).toBe(false);
  });

  it('returns false when root endpoint is non-200', async () => {
    const port = await createServer((_req, res) => {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('unavailable');
    });

    const running = await isDaemonRunning(port);
    expect(running).toBe(false);
  });
});
