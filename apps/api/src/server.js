require("dotenv").config();
const app = require("./app");
const { startWhatsAppBroadcastWorker, stopWhatsAppBroadcastWorker } = require("./modules/whatsapp/whatsapp.broadcasts.worker");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Storvex backend running on port ${PORT}`);
  startWhatsAppBroadcastWorker();
});

function shutdown() {
  stopWhatsAppBroadcastWorker();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
