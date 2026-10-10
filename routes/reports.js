const express = require("express");

const router = express.Router();

const {
  getTodayBusinessReport
} = require("../controllers/reportsController");

router.get("/today", getTodayBusinessReport);

module.exports = router;