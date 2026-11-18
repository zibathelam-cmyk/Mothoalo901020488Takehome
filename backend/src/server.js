import app from './app.js';
import { config } from './config.js';
import { initializeDatabase, pool } from './db.js';

async function start() {
  await initializeDatabase();
  const server = app.listen(config.port, () => {
    console.log(`BukaHub API listening on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Could not start BukaHub API:', error.message);
  process.exit(1);
});
