const express = require("express");

const router = express.Router();

const {
  getShops,
  getShopSummary,
  getShopTimeLine,
  createShops,
  getShopBalance,
  getShopTraySummary
} = require("../controllers/shopsController");

router.get("/shops", getShops);
router.get("/shop-summary/:id",getShopSummary);
router.get("/shops/:id/timeline",getShopTimeLine);
router.post("/shops",createShops);
router.get("/all-shop-balances",getShopBalance);
router.get("/shop-tray-summary/:shopId",getShopTraySummary);

module.exports = router;