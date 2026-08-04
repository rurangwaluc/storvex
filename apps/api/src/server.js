require("dotenv").config();
const app = require("./app");
const prisma = require("./config/database");
const {
  connectRedis,
  disconnectRedis,
} = require("./lib/cache/redisClient");
const { startWhatsAppBroadcastWorker, stopWhatsAppBroadcastWorker } = require("./modules/whatsapp/whatsapp.broadcasts.worker");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Storvex backend running on port ${PORT}`);
  startWhatsAppBroadcastWorker();

  void connectRedis();
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`Stopping Storvex API (${signal})...`);

  stopWhatsAppBroadcastWorker();

  server.close(async () => {
    try {
      await Promise.allSettled([
        disconnectRedis(),
        prisma.$disconnect(),
      ]);
    } finally {
      process.exit(0);
    }
  });
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
