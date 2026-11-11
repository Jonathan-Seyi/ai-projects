import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535');
  process.exitCode = 1;
} else {
  const server = createApp();
  server.listen(port, '127.0.0.1', () => {
    console.log('Task API listening on http://127.0.0.1:' + server.address().port);
  });
}
