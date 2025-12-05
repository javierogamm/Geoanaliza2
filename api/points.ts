import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

const appCandidates = [
  path.resolve(process.cwd(), 'backend/dist/app.js'),
  path.join(__dirname, '../backend/dist/app.js'),
  path.join(__dirname, 'backend/dist/app.js'),
  path.resolve(process.cwd(), 'backend/src/app'),
  path.join(__dirname, '../backend/src/app'),
  path.join(__dirname, 'backend/src/app')
];

const appModulePath = appCandidates.find((candidate) => {
  const exists = fs.existsSync(candidate);
  if (!exists) {
    console.warn('[api/points] App candidate missing', { candidate });
  }
  return exists;
});

let app: unknown;
let appLoadError: Error | null = null;

if (!appModulePath) {
  appLoadError = new Error('No se encontró el módulo de la aplicación Express');
  console.error('[api/points] No Express app module found', { candidates: appCandidates });
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    app = require(appModulePath).default;
    console.info(`[api/points] Loading Express app from ${appModulePath}`);
  } catch (error) {
    appLoadError = error as Error;
    console.error('[api/points] Failed to load Express app', {
      modulePath: appModulePath,
      message: appLoadError.message,
      stack: appLoadError.stack
    });
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const startedAt = Date.now();
  console.info(`[api/points] Incoming request: ${req.method} ${req.url} (app: ${appModulePath})`);

  if (appLoadError || typeof app !== 'function') {
    const message = appLoadError?.message || 'Aplicación Express no disponible';
    console.error('[api/points] App not ready', {
      message,
      stack: appLoadError?.stack,
      candidates: appCandidates,
      resolvedModule: appModulePath
    });
    res.statusCode = 500;
    res.end(message);
    return undefined;
  }

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info('[api/points] Response sent', {
      statusCode: res.statusCode,
      durationMs,
      url: req.url
    });
  });

  try {
    return (app as any)(req as any, res as any);
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
