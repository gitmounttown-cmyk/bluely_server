const Order = require("../model/orderModel");
const Product = require("../model/productModel");

// Create Order (Website Checkout or Admin POS)
const createOrder = async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    // Ensure volume and hsnCode are populated for each item
    const items = await Promise.all(
      rawItems.map(async (item) => {
        let volume = item.volume || item.litre || "";
        let productName = item.productName || item.name || "";
        let price = Number(item.price || 0);

        if ((!volume || !productName || !price) && item.product) {
          try {
            const dbProd = await Product.findById(item.product).lean();
            if (dbProd) {
              if (!volume) volume = dbProd.litre || "1L";
              if (!productName) productName = dbProd.name;
              if (!price) price = dbProd.price;
            }
          } catch (_) {}
        }

        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.lineTotal || price * quantity);

        return {
          product: item.product,
          productName: productName || "Bluely Product",
          quantity,
          volume: volume || "1L",
          hsnCode: item.hsnCode || "9018",
          price,
          lineTotal,
        };
      })
    );

    const subtotal = Number(req.body.subtotal || items.reduce((s, i) => s + i.lineTotal, 0));
    // Default 5% total GST (SGST 2.5% + CGST 2.5%) for medical & bulk cleaning supplies
    const sgst = Number(req.body.sgst !== undefined ? req.body.sgst : (subtotal * 0.025).toFixed(2));
    const cgst = Number(req.body.cgst !== undefined ? req.body.cgst : (subtotal * 0.025).toFixed(2));
    const tax = Number(req.body.tax !== undefined ? req.body.tax : (sgst + cgst));
    const discount = Number(req.body.discount || 0);
    const totalAmount = Number(req.body.totalAmount || (subtotal + tax - discount).toFixed(2));

    const hospitalOrCompanyName =
      req.body.hospitalOrCompanyName ||
      req.body.companyName ||
      req.body.customerName ||
      "GANGA MEDICAL CENTRE AND HOSPITIALS PVT LTD";

    // ALWAYS default payment status to Pending as required for delayed bank bulk payment
    const paymentStatus = req.body.paymentStatus || "Pending";
    const status = paymentStatus === "Paid" ? "Paid" : "Pending";
    const orderStatus = status;

    const orderData = {
      ...req.body,
      items,
      subtotal,
      sgst,
      cgst,
      tax,
      discount,
      totalAmount,
      hospitalOrCompanyName,
      customerName: hospitalOrCompanyName,
      buyerGstin: req.body.buyerGstin || req.body.gstNumber || "33AABCG8283F1ZN",
      buyerAddress: req.body.buyerAddress || req.body.shippingAddress || "NO .2 , SWARNABIGA LAYOUT, RAMNAGAR, COIMBATORE -641 009",
      paymentMethod: req.body.paymentMethod || "Bank Transfer",
      paymentStatus,
      status,
      orderStatus,
      user: req.user ? req.user.id : null,
      invoiceNo: req.body.invoiceNo || `V26-${Math.floor(100 + Math.random() * 900)}`,
      deliveryNote: req.body.deliveryNote || `DNTV26-${Math.floor(100 + Math.random() * 900)}`,
      termsOfPayment: req.body.termsOfPayment || "Delayed Bank Transfer (Days / Weeks / Month based delay)",
      dispatchedThrough: req.body.dispatchedThrough || "Direct",
      termsOfDelivery: req.body.termsOfDelivery || "Direct Hospital Delivery",
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
    const { paymentStatus, month, hospital } = req.query;
    const filter = { isDeleted: false };

    if (paymentStatus && paymentStatus !== "All") {
      filter.paymentStatus = paymentStatus;
    }

    if (hospital && hospital !== "All") {
      filter.$or = [
        { hospitalOrCompanyName: { $regex: hospital, $options: "i" } },
        { customerName: { $regex: hospital, $options: "i" } },
      ];
    }

    if (month && month !== "All") {
      // Expecting YYYY-MM
      const [year, m] = month.split("-").map(Number);
      if (year && m) {
        const start = new Date(Date.UTC(year, m - 1, 1));
        const end = new Date(Date.UTC(year, m, 1));
        filter.createdAt = { $gte: start, $lt: end };
      }
    }

    const orders = await Order.find(filter)
      .populate({
        path: "user",
        select: "name email",
        options: { lean: true },
      })
      .populate({
        path: "items.product",
        select: "name price image imageURL litre",
        options: { lean: true },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
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

// Update order status (Pending -> Paid, etc.)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, bankReference } = req.body;
    const targetStatus = paymentStatus || status;

    const updateFields = {
      orderStatus: targetStatus,
      status: targetStatus,
      paymentStatus: targetStatus,
    };

    if (targetStatus === "Paid") {
      updateFields.paidAt = new Date();
      if (bankReference) updateFields.bankReference = bankReference;
    } else if (targetStatus === "Pending") {
      updateFields.paidAt = null;
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: updated, message: `Payment status updated to ${targetStatus}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dedicated Payment Status updater
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, bankReference, paidAt } = req.body;
    if (!paymentStatus) {
      return res.status(400).json({ success: false, message: "paymentStatus is required" });
    }

    const updateFields = {
      paymentStatus,
      status: paymentStatus === "Paid" ? "Paid" : "Pending",
      orderStatus: paymentStatus === "Paid" ? "Paid" : "Pending",
    };

    if (paymentStatus === "Paid") {
      updateFields.paidAt = paidAt || new Date();
      if (bankReference) updateFields.bankReference = bankReference;
    } else {
      updateFields.paidAt = null;
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

    res.status(200).json({
      success: true,
      message: `Order payment marked as ${paymentStatus}`,
      data: updated,
    });
  } catch (error) {
    console.error("updatePaymentStatus error:", error);
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

    order.items = order.items.filter((item) => item._id?.toString() !== itemId && item.product?.toString() !== itemId);
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
  updatePaymentStatus,
  deleteOrder,
  removeOrderItem,
};
