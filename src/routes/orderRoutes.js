
const express = require("express");
const router = express.Router();

const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controller/orderController");

// Create a new bill/order
router.post("/create", createOrder);

// Get all orders with pagination and optional status filter
router.get("/all", getAllOrders);

// Get one order
router.get("/:id", getOrderById);

// Update customer or payment method on an editable order
router.put("/update/:id", updateOrder);

// Complete or cancel an order
router.patch("/:id/status", updateOrderStatus);

// Archive an eligible order
router.delete("/delete/:id", deleteOrder);

module.exports = router;
