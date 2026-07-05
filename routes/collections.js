const express = require("express");

const router = express.Router();

const {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection
} = require("../controllers/collectionsController");

router.get("/collections", getCollections);

router.post("/collections", createCollection);

router.put("/collections/:id", updateCollection);

router.delete("/collections/:id", deleteCollection);
module.exports = router;