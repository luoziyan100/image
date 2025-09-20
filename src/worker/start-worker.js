// Simple JS launcher to start BullMQ worker in a separate process
// Usage: ENABLE_QUEUE_WORKER=true node src/worker/start-worker.js

process.env.ENABLE_QUEUE_WORKER = process.env.ENABLE_QUEUE_WORKER || 'true';

console.log('[Worker] Starting image-generation worker...');

// Import the TypeScript module via dynamic import to avoid CommonJS require.
(async () => {
  try {
    await import('../lib/queue-manager');
    console.log('[Worker] Worker initialized.');
  } catch (error) {
    console.error('[Worker] Failed to initialize worker:', error);
    process.exitCode = 1;
  }
})();

// Keep process alive
setInterval(() => {}, 1 << 30);
