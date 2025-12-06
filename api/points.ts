import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

const distAppPath = path.join(__dirname, '../backend/dist/app.js');

if (!fs.existsSync(distAppPath)) {
  throw new Error(
    `[api/points] No se encontró ${distAppPath}. Ejecuta \"npm run build\" para compilar el backend antes del despliegue.`
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const app = require(distAppPath).default;

console.info(`[api/points] Loading Express app from ${distAppPath}`);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const startedAt = Date.now();
  console.info(`[api/points] Incoming request: ${req.method} ${req.url} (app: ${distAppPath})`);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info('[api/points] Response sent', {
      statusCode: res.statusCode,
      durationMs,
      url: req.url
    });
  });

  try {
    return app(req as any, res as any);
  } catch (error) {
    console.error('[api/points] Unhandled error in serverless handler', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.statusCode = 500;
    res.end('Internal Server Error');
    return undefined;
  }
}
