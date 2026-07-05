const express = require("express");

const router = express.Router();

const {
  getRetailerTray,
  createRetailerTray,
  updateRetailerTray,
  deleteRetailerTray,
  getRetailerTraySummary
} = require("../controllers/retailerTrayController");

router.get(
  "/retailer-tray",
  getRetailerTray
);

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