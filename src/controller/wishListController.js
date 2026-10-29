const Wishlist = require("../model/wishListModel");

const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id }).populate("products");
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [] });
    }
    const products = wishlist.products || [];
    const items = products.map((p) => ({
      _id: p._id,
      productId: p,
      name: p.name,
      price: p.price,
      image: p.imageURL || p.image,
      stock: p.stock,
      rating: 4.8,
    }));

    res.status(200).json({
      success: true,
      items,
      data: { items },
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const productId = req.body.productId || req.body._id || req.body.id;
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }
    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [productId] });
    } else if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    const updated = await Wishlist.findOne({ user: req.user.id }).populate("products");
    res.status(200).json({
      success: true,
      message: "Added to wishlist",
      products: updated.products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        (id) => id.toString() !== productId
      );
      await wishlist.save();
    }

    const updated = await Wishlist.findOne({ user: req.user.id }).populate("products");
    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
      products: updated ? updated.products : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
