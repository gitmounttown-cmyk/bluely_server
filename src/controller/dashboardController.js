const Product = require("../model/productModel");
const Order = require("../model/orderModel");
const User = require("../model/userModel");

// Get comprehensive dashboard statistics & summaries with month-wise and hospital-wise pending bills
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total Products Count
    const totalProducts = await Product.countDocuments();

    // 2. Low Stock Count (Stock <= 10)
    const lowStockCount = await Product.countDocuments({ stock: { $lte: 10 } });

    // 3. Total Customers Count
    const totalCustomers = await User.countDocuments();

    // 4. Orders & Total Sales Calculation
    const orders = await Order.find({ isDeleted: false })
      .populate("items.product", "name price litre imageURL")
      .sort({ createdAt: -1 })
      .lean();

    const totalOrders = orders.length;

    const totalSales = orders.reduce((sum, order) => {
      const amount = order.totalAmount || order.grandTotal || order.subtotal || 0;
      return sum + amount;
    }, 0);

    // 5. Pending Bills Analytics (Month-wise and Hospital / Company-based)
    let totalPendingAmount = 0;
    let totalPendingCount = 0;
    let totalPaidAmount = 0;
    let totalPaidCount = 0;

    const monthMap = {};
    const companyMap = {};
    const allPendingBills = [];

    const now = new Date();

    orders.forEach((order) => {
      const amount = Number(order.totalAmount || order.grandTotal || order.subtotal || 0);
      const isPending = (order.paymentStatus === "Pending" || order.status === "Pending") && order.paymentStatus !== "Paid";

      if (isPending) {
        totalPendingAmount += amount;
        totalPendingCount += 1;

        const orderDate = new Date(order.createdAt || order.orderDate || now);
        const daysPending = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));
        const delayNotice =
          daysPending > 60
            ? `${Math.floor(daysPending / 30)} Months Delayed`
            : daysPending > 30
            ? "1 Month Delayed"
            : daysPending > 14
            ? `${Math.floor(daysPending / 7)} Weeks Delayed`
            : `${daysPending} Days Delayed`;

        const hospitalName =
          (order.hospitalOrCompanyName || order.customerName || "Ganga Medical Centre and Hospitals Pvt Ltd").trim();

        // Month key: YYYY-MM
        const year = orderDate.getFullYear();
        const monthNum = String(orderDate.getMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${monthNum}`;
        const monthLabel = orderDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        // Total volume calculation for the order
        const totalVolumeSummary = (order.items || [])
          .map((i) => `${i.volume || i.product?.litre || "1L"} × ${i.quantity}`)
          .join(", ") || "Bulk Supply";

        const billData = {
          _id: order._id,
          orderNo: order.orderNo,
          invoiceNo: order.invoiceNo || `V26-${order.orderNo?.slice(-3) || "159"}`,
          deliveryNote: order.deliveryNote || "DNTV26-159",
          customer: order.customerName,
          hospitalOrCompanyName: hospitalName,
          buyerGstin: order.buyerGstin || "33AABCG8283F1ZN",
          buyerAddress: order.buyerAddress || order.shippingAddress || "Coimbatore, Tamil Nadu",
          date: orderDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          rawDate: orderDate.toISOString(),
          amount: amount,
          formattedAmount: `₹ ${amount.toLocaleString("en-IN")}`,
          paymentMethod: order.paymentMethod || "Bank Transfer",
          paymentStatus: "Pending",
          daysPending,
          delayNotice,
          termsOfPayment: order.termsOfPayment || "Delayed Bank Transfer",
          volumeSummary: totalVolumeSummary,
          itemsCount: order.items?.length || 0,
          items: (order.items || []).map((i) => ({
            name: i.productName || i.product?.name || "Medical / Cleaning Supply",
            volume: i.volume || i.product?.litre || "1L",
            quantity: i.quantity,
            rate: i.price,
            amount: i.lineTotal,
            hsnCode: i.hsnCode || "9018",
          })),
        };

        allPendingBills.push(billData);

        // Group by Month
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            monthKey,
            monthLabel,
            year,
            monthNum: Number(monthNum),
            count: 0,
            totalAmount: 0,
            bills: [],
          };
        }
        monthMap[monthKey].count += 1;
        monthMap[monthKey].totalAmount += amount;
        monthMap[monthKey].bills.push(billData);

        // Group by Hospital / Company
        if (!companyMap[hospitalName]) {
          companyMap[hospitalName] = {
            companyName: hospitalName,
            buyerGstin: billData.buyerGstin,
            buyerAddress: billData.buyerAddress,
            totalPending: 0,
            billCount: 0,
            oldestDays: 0,
            delayNotice: "",
            bills: [],
          };
        }
        companyMap[hospitalName].totalPending += amount;
        companyMap[hospitalName].billCount += 1;
        companyMap[hospitalName].bills.push(billData);
        if (daysPending > companyMap[hospitalName].oldestDays) {
          companyMap[hospitalName].oldestDays = daysPending;
          companyMap[hospitalName].delayNotice = delayNotice;
        }
      } else {
        totalPaidAmount += amount;
        totalPaidCount += 1;
      }
    });

    // Format pendingByMonth (sorted chronologically descending)
    const pendingByMonth = Object.values(monthMap)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((m) => ({
        ...m,
        formattedTotal: `₹ ${m.totalAmount.toLocaleString("en-IN")}`,
      }));

    // Format pendingByCompany (sorted by pending amount descending)
    const pendingByCompany = Object.values(companyMap)
      .sort((a, b) => b.totalPending - a.totalPending)
      .map((c) => ({
        ...c,
        formattedTotal: `₹ ${c.totalPending.toLocaleString("en-IN")}`,
      }));

    // 6. Recent Orders (Top 5)
    const recentOrders = orders.slice(0, 5).map((order) => {
      const orderAmount = order.totalAmount || order.grandTotal || 0;
      const paymentStatus = order.paymentStatus || order.status || "Pending";
      return {
        _id: order._id,
        orderNo: order.orderNo || `ORD-${order._id.toString().slice(-6)}`,
        invoiceNo: order.invoiceNo || "V26-159",
        customer: order.hospitalOrCompanyName || order.customerName || "Ganga Medical Centre",
        date: new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        amount: `₹ ${orderAmount.toLocaleString("en-IN")}`,
        rawAmount: orderAmount,
        status: paymentStatus,
        paymentStatus: paymentStatus,
      };
    });

    // 7. Inventory Overview Table (Populating category name)
    const inventoryOverview = await Product.find()
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const formattedInventory = inventoryOverview.map((item) => ({
      _id: item._id,
      name: item.name,
      sku: item.sku || `BLU-${item._id.toString().slice(-4).toUpperCase()}`,
      category: item.category?.name || item.categoryName || item.category || "General",
      litre: item.litre || "1L",
      stock: item.stock ?? 0,
      status: (item.stock ?? 0) === 0 ? "Out of Stock" : (item.stock ?? 0) <= 10 ? "Low Stock" : "In Stock",
    }));

    // 8. Low Stock Items List
    const lowStockItemsQuery = await Product.find({ stock: { $lte: 10 } })
      .populate("category", "name")
      .sort({ stock: 1 })
      .limit(5)
      .lean();

    const formattedLowStock = lowStockItemsQuery.map((item) => ({
      _id: item._id,
      name: item.name,
      sku: item.sku || "BLU-SKU",
      category: item.category?.name || item.categoryName || item.category || "General",
      litre: item.litre || "1L",
      stock: item.stock ?? 0,
      status: (item.stock ?? 0) === 0 ? "Out of Stock" : "Low Stock",
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalSales: `₹ ${totalSales.toLocaleString("en-IN")}`,
        totalOrders,
        totalProducts,
        totalCustomers,
        lowStockCount,
        recentOrders,
        lowStockItems: formattedLowStock,
        inventoryOverview: formattedInventory,
        // Detailed Pending Bills analytics
        pendingSummary: {
          totalPendingAmount,
          formattedTotalPending: `₹ ${totalPendingAmount.toLocaleString("en-IN")}`,
          totalPendingCount,
          totalPaidAmount,
          formattedTotalPaid: `₹ ${totalPaidAmount.toLocaleString("en-IN")}`,
          totalPaidCount,
        },
        pendingByMonth,
        pendingByCompany,
        allPendingBills,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};
