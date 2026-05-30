// Idempotent "migration": ensure the widgets table exists.
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS widgets (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  await client.end();
  console.log('migrate: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
