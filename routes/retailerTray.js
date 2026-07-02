const express = require("express");

const router = express.Router();

const {
  createRetailerTray,
  updateRetailerTray,
  deleteRetailerTray,
  getRetailerTraySummary
} = require("../controllers/retailerTrayController");

router.post(
  "/retailer-tray",
  createRetailerTray
);

router.put(
  "/retailer-tray/:id",
  updateRetailerTray
);

router.delete(
  "/retailer-tray/:id",
  deleteRetailerTray
);

router.get(
   "/retailer-tray-summary",
   getRetailerTraySummary
);
module.exports = router;