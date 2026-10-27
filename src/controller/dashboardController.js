const Product = require("../model/productModel");
const Order = require("../model/orderModel");
const User = require("../model/userModel");

// Get comprehensive dashboard statistics & summaries with populated categories
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total Products Count
    const totalProducts = await Product.countDocuments();

    // 2. Low Stock Count (Stock <= 10)
    const lowStockCount = await Product.countDocuments({ stock: { $lte: 10 } });

    // 3. Total Customers Count
    const totalCustomers = await User.countDocuments();

    // 4. Orders & Total Sales Calculation
    const orders = await Order.find().sort({ createdAt: -1 });
    const totalOrders = orders.length;
    
    const totalSales = orders.reduce((sum, order) => {
      const amount = order.totalAmount || order.grandTotal || order.subtotal || 0;
      return sum + amount;
    }, 0);

    // 5. Recent Orders (Top 5)
    const recentOrders = orders.slice(0, 5).map(order => ({
      _id: order._id,
      orderNo: order.orderNo || `BLU-${Math.floor(10000 + Math.random() * 90000)}`,
      customer: order.customerName || 'Walk-in Customer',
      date: new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      amount: `₹ ${(order.totalAmount || order.grandTotal || 0).toLocaleString('en-IN')}`,
      status: order.status || 'Completed'
    }));

    // 6. Inventory Overview Table (Populating category name)
    const inventoryOverview = await Product.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const formattedInventory = inventoryOverview.map(item => ({
      _id: item._id,
      name: item.name,
      sku: item.sku || 'BLU-SKU',
      category: item.category?.name || item.categoryName || item.category || 'General',
      stock: item.stock ?? 0,
      status: (item.stock ?? 0) === 0 ? 'Out of Stock' : (item.stock ?? 0) <= 10 ? 'Low Stock' : 'In Stock'
    }));

    // 7. Low Stock Items List (Populating category name)
    const lowStockItemsQuery = await Product.find({ stock: { $lte: 10 } })
      .populate('category', 'name')
      .sort({ stock: 1 })
      .limit(5)
      .lean();

    const formattedLowStock = lowStockItemsQuery.map(item => ({
      _id: item._id,
      name: item.name,
      sku: item.sku || 'BLU-SKU',
      category: item.category?.name || item.categoryName || item.category || 'General',
      stock: item.stock ?? 0,
      status: (item.stock ?? 0) === 0 ? 'Out of Stock' : 'Low Stock'
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalSales: `₹ ${totalSales.toLocaleString('en-IN')}`,
        totalOrders,
        totalProducts,
        totalCustomers,
        lowStockCount,
        recentOrders,
        lowStockItems: formattedLowStock,
        inventoryOverview: formattedInventory,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics", 
      error: error.message 
    });
  }
};