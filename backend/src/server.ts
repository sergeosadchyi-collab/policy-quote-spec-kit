import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { handler } from './handler.ts';
import type { QuoteApiEvent } from './types/lambda.ts';

/**
 * A thin HTTP adapter over the handler — never the reverse (Principle III).
 *
 * Its ENTIRE responsibility is translation:
 *
 *   IncomingMessage → collect body → QuoteApiEvent → handler() → ServerResponse
 *
 * It deliberately contains no routing decision that affects the response body,
 * no validation, no scoring, and no error classification. Method and path
 * handling live in the handler, so an HTTP call and a direct Lambda invocation
 * cannot diverge. If a behaviour can only be tested through this file, it is in
 * the wrong layer.
 */

const PORT = 3000;

async function readBody(request: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return chunks.length === 0 ? null : Buffer.concat(chunks).toString('utf8');
}

function toEvent(request: IncomingMessage, body: string | null): QuoteApiEvent {
  return {
    httpMethod: request.method ?? '',
    path: (request.url ?? '').split('?')[0] ?? '',
    headers: request.headers as Record<string, string | undefined>,
    body,
  };
}

const server = createServer((request: IncomingMessage, response: ServerResponse) => {
  void (async () => {
    const body = await readBody(request);
    const result = await handler(toEvent(request, body), {});
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
  })();
});

server.listen(PORT, () => {
  process.stdout.write(`PolicyQuote backend listening on http://localhost:${PORT}\n`);
});
