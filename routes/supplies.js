const express = require("express");

const router = express.Router();

const {
   getSupplies,
   createSupply,
   updateSupply,
   deleteSupply
} = require("../controllers/suppliesController");

router.get("/supplies", getSupplies);

router.post("/supplies", createSupply);

router.put("/supplies/:id", updateSupply);

router.delete("/supplies/:id", deleteSupply);

module.exports = router;