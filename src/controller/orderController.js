const mongoose = require("mongoose");
const Order = require("../model/orderModel");
const Product = require("../model/productModel");
const sendInvoiceEmail = require("../utils/sendEmail");

const TAX_RATE = 0.18;

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const generateOrderNo = () => {
  return `BLU-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
};

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

    const query = Product.findById(item.product);
    if (session) query.session(session);
    const product = await query;

    if (!product) {
      throw new Error(`Product not found: ${item.product}`);
    }

    if (product.isActive === false || product.isDeleted === true) {
      throw new Error(`Product is not available: ${product.name}`);
    }

    // Safely fallback stock to 0 if undefined
    const currentStock = product.stock ?? 0;
    if (currentStock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}`);
    }

    const price = Number(product.sellingPrice ?? product.price);

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

const deductStock = async (items, session) => {
  for (const item of items) {
    const options = session ? { session } : {};
    
    // Atomically decrement stock, ensuring stock doesn't drop below 0
    const result = await Product.updateOne(
      {
        _id: item.product,
        stock: { $gte: item.quantity },
      },
      {
        $inc: { stock: -item.quantity },
      },
      options
    );

    if (result.modifiedCount !== 1) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
  }
};

const restoreStock = async (items, session) => {
  for (const item of items) {
    const options = session ? { session } : {};
    await Product.updateOne(
      { _id: item.product },
      {
        $inc: { stock: item.quantity },
      },
      options
    );
  }
};

exports.createOrder = async (req, res) => {
  let session = null;
  try {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }

    const {
      customerName,
      customerEmail,
      items,
      discount = 0,
      paymentMethod,
      status = "Completed",
    } = req.body;

    if (!["Cash", "UPI", "Card"].includes(paymentMethod)) {
      throw new Error("Payment method must be Cash, UPI or Card");
    }

    const preparedItems = await prepareOrderItems(items, session);
    const totals = calculateTotals(preparedItems, discount);

    if (status === "Completed") {
      await deductStock(preparedItems, session);
    }

    const orderOptions = session ? { session } : {};
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
      orderOptions
    );

    if (session) {
      await session.commitTransaction();
    }

    sendInvoiceEmail(order, customerEmail).catch((err) => {
      console.error("Email dispatch failed:", err);
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (e) {}
    }
    console.error("Create order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .populate("items.product", "name price sellingPrice imageURL")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, isDeleted: false })
      .populate("items.product", "name price sellingPrice imageURL");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

exports.updateOrder = async (req, res) => {
  return res.status(200).json({ success: true, message: "Order updated" });
};

exports.updateOrderStatus = async (req, res) => {
  return res.status(200).json({ success: true, message: "Status updated" });
};

exports.deleteOrder = async (req, res) => {
  return res.status(200).json({ success: true, message: "Order deleted" });
};