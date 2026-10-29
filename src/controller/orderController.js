const Order = require("../model/orderModel");

// Create Order (Website Checkout or Admin POS)
const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      user: req.user ? req.user.id : null,
      orderStatus: req.body.status || req.body.orderStatus || "Processing"
    };
    const newOrder = await Order.create(orderData);
    res.status(201).json({ success: true, order: newOrder, data: newOrder });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get logged-in customer's own orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("items.product").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all orders (Admin & Cashier dashboard) with safe population
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate({
        path: "user",
        select: "name email",
        options: { lean: true }
      })
      .populate({
        path: "items.product",
        select: "name price image imageURL",
        options: { lean: true }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
      orders,
    });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user items.product");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: order, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id, 
      { orderStatus: status, status: status }, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.items = order.items.filter(item => item._id?.toString() !== itemId && item.product?.toString() !== itemId);
    await order.save();
    res.status(200).json({ success: true, message: "Item removed from order", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  removeOrderItem,
};
