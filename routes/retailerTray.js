const express = require("express");

const router = express.Router();

const {
  createRetailerTray,
  updateRetailerTray,
  deleteRetailerTray
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
module.exports = router;