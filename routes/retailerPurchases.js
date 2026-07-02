const express = require("express");

const router = express.Router();

const {
   createRetailerPurchase,
   updateRetailerPurchase,
   deleteRetailerPurchase
} = require("../controllers/retailerPurchasesController");

router.post(
  "/retailer-purchases",
  createRetailerPurchase
);

router.put(
  "/retailer-purchases/:id",
  updateRetailerPurchase
);

router.delete(
  "/retailer-purchases/:id",
  deleteRetailerPurchase
);

module.exports = router;