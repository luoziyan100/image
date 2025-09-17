// Simple JS launcher to start BullMQ worker in a separate process
// Usage: ENABLE_QUEUE_WORKER=true node src/worker/start-worker.js

process.env.ENABLE_QUEUE_WORKER = process.env.ENABLE_QUEUE_WORKER || 'true';

console.log('[Worker] Starting image-generation worker...');

// Import the TS module compiled by Next/ts-node is not used here.
// We rely on runtime JS transpilation being unnecessary because queue-manager is TS/JS using Node APIs only.
// Node can import TS via transpiled JS in memory for simple syntax, but to be safe we use dynamic import with ts extension via esm transpiler if needed.
// In this repository, TypeScript features used are compatible with Node's loader thanks to Next build context.

require('../lib/queue-manager');

console.log('[Worker] Worker initialized.');

// Keep process alive
setInterval(() => {}, 1 << 30);

