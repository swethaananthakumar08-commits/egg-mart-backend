const express = require("express");

const router = express.Router();

const {
  getShops,
  getShopSummary,
  getShopTimeLine
} = require("../controllers/shopsController");

router.get("/shops", getShops);
router.get("/shop-summary/:id",getShopSummary);
router.get("/shops/:id/timeline",getShopTimeLine)

module.exports = router;