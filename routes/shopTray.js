const express = require("express");

const router = express.Router();

const {
  createShopTray,
  updateShopTray,
  deleteShopTray
} = require("../controllers/ShopTrayController");

router.post("/shop-tray", createShopTray);

router.put("/shop-tray/:id", updateShopTray);

router.delete("/shop-tray/:id", deleteShopTray);
module.exports = router;