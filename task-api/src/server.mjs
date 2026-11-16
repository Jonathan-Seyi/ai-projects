import { createApp } from './app.mjs';
import { createFileTaskStore } from './file-store.mjs';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535');
  process.exitCode = 1;
} else {
  try {
    // Persistence is opt-in; existing in-memory behavior remains the default.
    const dataFile = process.env.TASKS_FILE;
    const store = dataFile ? createFileTaskStore(dataFile) : undefined;
    const server = createApp(store);
    server.listen(port, '127.0.0.1', () => {
      console.log('Task API listening on http://127.0.0.1:' + server.address().port);
      console.log(dataFile ? 'Storage: local JSON file' : 'Storage: in-memory (temporary)');
    });
  } catch (error) {
    console.error('Could not initialize task storage:', error.message);
    process.exitCode = 1;
  }
}
