const express = require("express");

const router = express.Router();

const {
   createSupply,
   updateSupply,
   deleteSupply
} = require("../controllers/suppliesController");

router.post("/supplies", createSupply);

router.put("/supplies/:id", updateSupply);

router.delete("/supplies/:id", deleteSupply);

module.exports = router;