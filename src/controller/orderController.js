
const mongoose = require("mongoose");
const Order = require("../model/orderModel");
const Product = require("../model/productModel");

// Configure this according to your applicable tax rules.
const TAX_RATE = 0.18;

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// Generate a readable order number.
const generateOrderNo = () => {
  return `BLU-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
};

// Calculate order totals on the server.
// Client-supplied prices and totals are never trusted.
const prepareOrderItems = async (items, session) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Add at least one product to the order");
  }

  const preparedItems = [];

  for (const item of items) {
    if (
      !item.product ||
      !mongoose.isValidObjectId(item.product) ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("Invalid product or quantity");
    }

    const product = await Product.findById(item.product).session(session);

    if (!product) {
      throw new Error(`Product not found: ${item.product}`);
    }

    if (product.isActive === false || product.isDeleted === true) {
      throw new Error(`Product is not available: ${product.name}`);
    }

    const price = Number(
      product.sellingPrice ?? product.price
    );

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for product: ${product.name}`);
    }

    preparedItems.push({
      product: product._id,
      productName: product.name,
      quantity: item.quantity,
      price,
      lineTotal: roundMoney(price * item.quantity),
    });
  }

  return preparedItems;
};

const calculateTotals = (items, discount = 0) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.lineTotal, 0)
  );

  if (
    typeof discount !== "number" ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > subtotal
  ) {
    throw new Error("Discount must be between zero and subtotal");
  }

  const taxableAmount = roundMoney(subtotal - discount);
  const tax = roundMoney(taxableAmount * TAX_RATE);
  const totalAmount = roundMoney(taxableAmount + tax);

  return {
    subtotal,
    discount: roundMoney(discount),
    tax,
    totalAmount,
  };
};

// Atomically deduct stock; never allow negative inventory.
const deductStock = async (items, session) => {
  for (const item of items) {
    const result = await Product.updateOne(
      {
        _id: item.product,
        stockQuantity: { $gte: item.quantity },
      },
      {
        $inc: { stockQuantity: -item.quantity },
      },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(
        `Insufficient stock for ${item.productName}`
      );
    }
  }
};

// Restore stock when a completed sale is cancelled.
const restoreStock = async (items, session) => {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product },
      {
        $inc: { stockQuantity: item.quantity },
      },
      { session }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Cannot restore stock for ${item.productName}`
      );
    }
  }
};

// ==========================================
// CREATE ORDER / COMPLETE BILLING
// POST /api/orders
// ==========================================
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const {
        customerName,
        items,
        discount = 0,
        paymentMethod,
        status = "Completed",
      } = req.body;

      if (!["Cash", "UPI", "Card"].includes(paymentMethod)) {
        throw new Error("Payment method must be Cash, UPI or Card");
      }

      if (!["Completed", "Pending", "Processing"].includes(status)) {
        throw new Error("Invalid initial order status");
      }

      const preparedItems = await prepareOrderItems(items, session);
      const totals = calculateTotals(preparedItems, discount);

      // Only completed sales deduct stock.
      // Pending and processing orders do not deduct stock yet.
      if (status === "Completed") {
        await deductStock(preparedItems, session);
      }

      const [order] = await Order.create(
        [
          {
            orderNo: generateOrderNo(),
            customerName:
              typeof customerName === "string" && customerName.trim()
                ? customerName.trim()
                : "Walk-in Customer",
            items: preparedItems,
            ...totals,
            paymentMethod,
            status,
            stockDeducted: status === "Completed",
          },
        ],
        { session }
      );

      createdOrder = order;
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: createdOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    const clientError =
      error.message.startsWith("Invalid") ||
      error.message.startsWith("Add at least") ||
      error.message.startsWith("Discount") ||
      error.message.startsWith("Insufficient stock") ||
      error.message.startsWith("Product not found") ||
      error.message.startsWith("Product is not available") ||
      error.message.startsWith("Cannot restore");

    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  } finally {
    await session.endSession();
  }
};

// ==========================================
// GET ALL ORDERS
// GET /api/orders
// ==========================================
exports.getAllOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = { isDeleted: false };

    if (req.query.status) {
      if (
        !["Completed", "Pending", "Processing", "Cancelled"].includes(
          req.query.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status filter",
        });
      }

      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("items.product", "name price sellingPrice imageURL")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// ==========================================
// GET ORDER BY ID
// GET /api/orders/:id
// ==========================================
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      isDeleted: false,
    }).populate("items.product", "name price sellingPrice imageURL");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

// ==========================================
// UPDATE ORDER
// PUT /api/orders/:id
//
// Only pending/processing orders can be edited.
// Product items and totals are immutable here.
// Cancel and recreate the order to change items.
// ==========================================
exports.updateOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const allowedFields = ["customerName", "paymentMethod"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Only customerName and paymentMethod can be updated",
      });
    }

    if (
      updates.paymentMethod !== undefined &&
      !["Cash", "UPI", "Card"].includes(updates.paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (
      updates.customerName !== undefined &&
      (typeof updates.customerName !== "string" ||
        !updates.customerName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot be empty",
      });
    }

    let updatedOrder;

    await session.withTransaction(async () => {
      updatedOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
          status: { $in: ["Pending", "Processing"] },
        },
        { $set: updates },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!updatedOrder) {
        throw new Error(
          "Order not found or cannot be edited in its current status"
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);

    return res.status(
      error.message.startsWith("Order not found") ? 409 : 500
    ).json({
      success: false,
      message: error.message || "Failed to update order",
    });
  } finally {
    await session.endSession();
  }
};

// ==========================================
// UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
//
// Complete a pending order: deduct stock.
// Cancel a completed order: restore stock.
// ==========================================
exports.updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!["Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Completed or Cancelled",
      });
    }

    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id,
        isDeleted: false,
      }).session(session);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.status === status) {
        updatedOrder = order;
        return;
      }

      if (order.status === "Cancelled") {
        throw new Error("CANCELLED_ORDER_IMMUTABLE");
      }

      if (status === "Completed") {
        if (order.stockDeducted) {
          throw new Error("STOCK_ALREADY_DEDUCTED");
        }

        await deductStock(order.items, session);
        order.stockDeducted = true;
        order.status = "Completed";
        order.cancelledAt = null;
      } else {
        // A completed sale must restore its stock.
        if (order.stockDeducted) {
          await restoreStock(order.items, session);
          order.stockDeducted = false;
        }

        order.status = "Cancelled";
        order.cancelledAt = new Date();
      }

      await order.save({ session });
      updatedOrder = order;
    });

    return res.status(200).json({
      success: true,
      message: `Order ${status.toLowerCase()} successfully`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    const messages = {
      ORDER_NOT_FOUND: [404, "Order not found"],
      CANCELLED_ORDER_IMMUTABLE: [
        409,
        "A cancelled order cannot be changed",
      ],
      STOCK_ALREADY_DEDUCTED: [
        409,
        "Stock has already been deducted for this order",
      ],
    };

    const [statusCode, message] = messages[error.message] || [
      error.message.startsWith("Insufficient stock") ? 409 : 500,
      error.message || "Failed to update order status",
    ];

    return res.status(statusCode).json({
      success: false,
      message,
    });
  } finally {
    await session.endSession();
  }
};

// ==========================================
// SOFT DELETE ORDER
// DELETE /api/orders/:id
//
// Completed and cancelled orders are retained.
// ==========================================
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (["Completed", "Cancelled"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: "Completed or cancelled orders cannot be deleted",
      });
    }

    order.isDeleted = true;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order archived successfully",
      data: order,
    });
  } catch (error) {
    console.error("Archive order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to archive order",
    });
  }
};
