let app;
try {
  app = require("../server/server.js");
} catch (err) {
  console.error("Critical error initializing server in Vercel function:", err);
  const express = require("express");
  app = express();
  app.all("*", (req, res) => {
    res.status(500).json({
      error: "Server Initialization Failed on Vercel",
      message: err.message,
      stack: err.stack,
    });
  });
}

module.exports = app;
