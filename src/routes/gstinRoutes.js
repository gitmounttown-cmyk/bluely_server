const express = require("express");
const router = express.Router();
const { verifyGstin } = require("../controller/gstinController");

router.get("/verify/:gstin", verifyGstin);
router.get("/verify", verifyGstin);

module.exports = router;
