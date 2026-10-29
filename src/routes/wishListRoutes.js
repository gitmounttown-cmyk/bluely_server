const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../controller/wishListController");

// Must be logged in to manage wishlist
router.get("/", verifyToken, getWishlist);
router.get("/all", verifyToken, getWishlist);
router.post("/add", verifyToken, addToWishlist);
router.delete("/:productId", verifyToken, removeFromWishlist);

module.exports = router;
