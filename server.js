const express = require("express");
const pool = require("./config/db");
const shopRoutes = require("./routes/shops");
const supplyRoutes = require("./routes/supplies");
const collectionRoutes =require("./routes/collections");
const retailerPurchaseRoutes =require("./routes/retailerPurchases");
const retailerTrayRoutes =require("./routes/retailerTray");
const shopTrayRoutes =require("./routes/shopTray");
const dashboardRoutes =require("./routes/dashboard");

const app = express();

app.use(express.json());
app.use("/", shopRoutes);
app.use("/", supplyRoutes);
app.use("/", collectionRoutes);
app.use("/",retailerPurchaseRoutes);
app.use("/", retailerTrayRoutes);
app.use("/", shopTrayRoutes);
app.use("/",dashboardRoutes);
app.get("/", (req, res) => {
  res.send("Egg Mart Backend Running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
