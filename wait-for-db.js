const net = require('net');
const { URL } = require('url');

const dbUrlStr = process.env.DATABASE_URL;
if (!dbUrlStr) {
  console.log('DATABASE_URL is not set. Skipping wait.');
  process.exit(0);
}

try {
  const dbUrl = new URL(dbUrlStr);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;

  console.log(`Waiting for database at ${host}:${port}...`);

  const checkConnection = () => {
    const client = new net.Socket();
    client.connect(port, host, () => {
      console.log('Database is up and reachable.');
      client.destroy();
      process.exit(0);
    });

    client.on('error', (err) => {
      console.log(`Database is not reachable yet (${err.message}). Retrying in 2 seconds...`);
      client.destroy();
      setTimeout(checkConnection, 2000);
    });
  };

  checkConnection();
} catch (e) {
  console.error('Failed to parse DATABASE_URL:', e.message);
  process.exit(1);
}
