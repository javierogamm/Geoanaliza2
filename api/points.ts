import type { IncomingMessage, ServerResponse } from 'http';
import app from '../backend/src/app';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  console.info(`[api/points] Incoming request: ${req.method} ${req.url}`);
  return app(req as any, res as any);
}
