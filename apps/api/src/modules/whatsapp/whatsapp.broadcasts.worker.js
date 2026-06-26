const broadcastService = require("./whatsapp.broadcasts.service");

const DEFAULT_INTERVAL_MS = Number(process.env.WHATSAPP_BROADCAST_WORKER_INTERVAL_MS || 30000);
const DEFAULT_JOB_LIMIT = Number(process.env.WHATSAPP_BROADCAST_WORKER_JOB_LIMIT || 2);
const DEFAULT_RECIPIENT_LIMIT = Number(process.env.WHATSAPP_BROADCAST_WORKER_RECIPIENT_LIMIT || 1000);

let intervalHandle = null;
let isRunning = false;

function workerEnabled() {
  return String(process.env.WHATSAPP_BROADCAST_WORKER || "1") !== "0";
}

async function runWhatsAppBroadcastWorkerOnce(options = {}) {
  if (isRunning) {
    return { skipped: true, reason: "ALREADY_RUNNING" };
  }

  isRunning = true;

  try {
    return await broadcastService.processQueuedBroadcasts({
      limit: options.limit || DEFAULT_JOB_LIMIT,
      recipientLimit: options.recipientLimit || DEFAULT_RECIPIENT_LIMIT,
      workerId: options.workerId || `wa-broadcast-worker-${process.pid}`,
    });
  } finally {
    isRunning = false;
  }
}

function startWhatsAppBroadcastWorker(options = {}) {
  if (!workerEnabled()) {
    console.log("WhatsApp broadcast worker disabled");
    return null;
  }

  if (intervalHandle) return intervalHandle;

  const intervalMs = Math.max(10000, Number(options.intervalMs || DEFAULT_INTERVAL_MS));

  intervalHandle = setInterval(() => {
    runWhatsAppBroadcastWorkerOnce(options).catch((error) => {
      console.error("WhatsApp broadcast worker tick failed:", error?.message || error);
    });
  }, intervalMs);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }

  runWhatsAppBroadcastWorkerOnce(options).catch((error) => {
    console.error("WhatsApp broadcast worker startup tick failed:", error?.message || error);
  });

  console.log(`WhatsApp broadcast worker started (${intervalMs}ms interval)`);
  return intervalHandle;
}

function stopWhatsAppBroadcastWorker() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

if (require.main === module) {
  runWhatsAppBroadcastWorkerOnce({
    limit: Number(process.env.WHATSAPP_BROADCAST_WORKER_JOB_LIMIT || 5),
    recipientLimit: Number(process.env.WHATSAPP_BROADCAST_WORKER_RECIPIENT_LIMIT || 1000),
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  runWhatsAppBroadcastWorkerOnce,
  startWhatsAppBroadcastWorker,
  stopWhatsAppBroadcastWorker,
};
