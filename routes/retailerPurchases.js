const express = require("express");

const router = express.Router();

const {
   getRetailerPurchases,
   createRetailerPurchase,
   updateRetailerPurchase,
   deleteRetailerPurchase
} = require("../controllers/retailerPurchasesController");

router.get(
  "/retailer-purchases",
  getRetailerPurchases
);

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