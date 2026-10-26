const express = require("express");
const router = express.Router();
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controller/orderController");

// Create a new bill/order (Admin & Cashier)[cite: 22]
router.post("/create", verifyToken, allowRoles("Admin", "Cashier"), createOrder);

// Get all orders with pagination and optional status filter (Admin & Cashier)[cite: 22]
router.get("/all", verifyToken, allowRoles("Admin", "Cashier"), getAllOrders);

// Get one order (Admin & Cashier)[cite: 22]
router.get("/:id", verifyToken, allowRoles("Admin", "Cashier"), getOrderById);

// Update customer or payment method on an editable order (Admin & Cashier)[cite: 22]
router.put("/update/:id", verifyToken, allowRoles("Admin", "Cashier"), updateOrder);

// Complete or cancel an order (Admin & Cashier)[cite: 22]
router.patch("/:id/status", verifyToken, allowRoles("Admin", "Cashier"), updateOrderStatus);

// Archive an eligible order (Admin Only)[cite: 22]
router.delete("/delete/:id", verifyToken, allowRoles("Admin"), deleteOrder);

module.exports = router;