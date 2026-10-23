const express = require ('express');
const cors = require ('cors');
const path = require ('path');

const app = express ();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ==========================================================
// MIDDLEWARE
// ==========================================================

app.use (
  cors ({
    // origin: 'http://localhost:5173',
    // origin: 'https://hazelcart.com',
    // credentials: true,
  })
);

app.use (express.json ());

app.use (
  '/api/payments/webhook',
  express.raw ({
    type: 'application/json',
  })
);

// ==========================================================
// STATIC UPLOADS
// ==========================================================

app.use ('/uploads', express.static (path.join (process.cwd (), 'uploads')));
// ==========================================================
// ROOT API
// ==========================================================

app.get ('/', (req, res) => {
  res.json ({
    success: true,
    message: 'Bluely API is running',
  });
});


// ==========================================================
// 404 HANDLER
// ==========================================================

app.use ((req, res) => {
  res.status (404).json ({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use ((err, req, res, next) => {
  console.error ('Global Error:', err);

  res.status (err.status || 500).json ({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;