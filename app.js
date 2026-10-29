const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================================
// MIDDLEWARE
// ==========================================================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  '/api/payments/webhook',
  express.raw({
    type: 'application/json',
  })
);

// ==========================================================
// STATIC UPLOADS
// ==========================================================
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ==========================================================
// ROOT API
// ==========================================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bluely API is running',
  });
});

// Mounted routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/users", require("./src/routes/authRoutes"));
app.use("/api/categories", require("./src/routes/categoryRoutes"));
app.use("/api/product", require("./src/routes/productRoutes"));
app.use("/api/products", require("./src/routes/productRoutes")); // Alias for plural requests
app.use("/api/order", require("./src/routes/orderRoutes"));
app.use("/api/orders", require("./src/routes/orderRoutes")); // Alias for plural requests
app.use("/api/dealers", require("./src/routes/dealerRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/wishlist", require("./src/routes/wishListRoutes"));
app.use("/api/why-choose-us", require("./src/routes/whyChooseUsRoutes"));
app.use("/api/addresses", require("./src/routes/addressRoutes"));

// Contact message endpoint
app.post("/api/contact", (req, res) => {
  console.log("Contact form submitted:", req.body);
  res.status(200).json({ success: true, message: "Thank you for reaching out! We will contact you soon." });
});

// Payment create-order alias directly to order creation
app.post("/api/payment/create-order", (req, res, next) => {
  req.url = "/create";
  return require("./src/routes/orderRoutes")(req, res, next);
});

// ==========================================================
// 404 HANDLER
// ==========================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
