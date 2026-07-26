const express = require("express");

const router = express.Router();

const {
  getStockSummary
} = require("../controllers/stockSummaryController");

router.get(
  "/",
  getStockSummary
);

module.exports = router;