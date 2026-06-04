import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

for (const envPath of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

const port = Number(process.env.PORT || 3333);
const database = createDatabase(process.env.DATABASE_URL || 'data/hostbr.sqlite');
const app = createApp({ database, env: process.env });

const server = app.listen(port, () => {
  console.log(`Hostbr API running on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
