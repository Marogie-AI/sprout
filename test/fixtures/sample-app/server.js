// Minimal app: returns the widget rows so we can confirm data was restored.
const http = require('node:http');
const { Client } = require('pg');

const server = http.createServer(async (_req, res) => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query('SELECT id, name FROM widgets ORDER BY id');
    await client.end();
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, count: rows.length, widgets: rows }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(e) }));
  }
});

server.listen(3000, () => console.log('sample-app on :3000'));
