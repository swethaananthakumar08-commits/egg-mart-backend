const express = require("express");

const router = express.Router();

const {
  getRetailerPayments,
  createRetailerPayment,
  getRetailerPayableSummary,
  updateRetailerPayment,
  deleteRetailerPayment
} = require("../controllers/retailerPaymentsController");

// ======================================
// GET RETAILER PAYMENTS
// ======================================
router.get(
  "/retailer-payments",
  getRetailerPayments
);


// ======================================
// CREATE RETAILER PAYMENT
// ======================================
router.post(
  "/retailer-payments",
  createRetailerPayment
);

// ======================================
// GET RETAILER PAYABLE SUMMARY
// ======================================
router.get(
  "/retailer-payable-summary",
  getRetailerPayableSummary
);

// ======================================
// UPDATE RETAILER PAYMENT
// ======================================
router.put(
  "/retailer-payments/:id",
  updateRetailerPayment
);

// ======================================
// DELETE RETAILER PAYMENT
// ======================================
router.delete(
  "/retailer-payments/:id",
  deleteRetailerPayment
);


module.exports = router;