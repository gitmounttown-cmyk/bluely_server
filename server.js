const fs = require("fs");
const path = require("path");

// ==========================================================
// APPLICATION LOGGING
// ==========================================================

const logDir = path.join(__dirname, "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, "app.log");

const writeLog = (message) => {
  const timestamp = new Date().toISOString();

  fs.appendFileSync(
    logFile,
    `[${timestamp}] ${message}\n`,
    "utf8"
  );
};

// Capture normal console output
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args
    .map(arg => {
      if (arg instanceof Error) return arg.stack;
      if (typeof arg === "object") return JSON.stringify(arg);
      return String(arg);
    })
    .join(" ");

  writeLog(`INFO: ${message}`);
  originalLog(...args);
};

console.error = (...args) => {
  const message = args
    .map(arg => {
      if (arg instanceof Error) return arg.stack;
      if (typeof arg === "object") return JSON.stringify(arg);
      return String(arg);
    })
    .join(" ");

  writeLog(`ERROR: ${message}`);
  originalError(...args);
};

// ==========================================================
// START APPLICATION
// ==========================================================

require("dotenv").config();

try {
  const app = require("./app");
  const connectDB = require("./src/config/db");

  const PORT = process.env.PORT || 5008;

  console.log("App loaded successfully");
  console.log("Connecting to MongoDB...");

  connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Bluely backend started successfully");
  });

} catch (error) {
  console.error("APPLICATION STARTUP FAILED");
  console.error(error);
}