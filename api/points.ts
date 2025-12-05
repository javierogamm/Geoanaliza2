import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

const distAppPath = path.join(__dirname, '../backend/dist/app.js');
const srcAppPath = path.join(__dirname, '../backend/src/app');
const appModulePath = fs.existsSync(distAppPath) ? distAppPath : srcAppPath;
// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const app = require(appModulePath).default;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  console.info(`[api/points] Incoming request: ${req.method} ${req.url}`);
  return app(req as any, res as any);
}
