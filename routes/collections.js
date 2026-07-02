const express = require("express");

const router = express.Router();

const {
  createCollection,
  updateCollection,
  deleteCollection
} = require("../controllers/collectionsController");

router.post("/collections", createCollection);

router.put("/collections/:id", updateCollection);

router.delete("/collections/:id", deleteCollection);
module.exports = router;