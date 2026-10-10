const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const shopRoutes = require("./routes/shops");
const supplyRoutes = require("./routes/supplies");
const collectionRoutes =require("./routes/collections");
const retailerPaymentsRoutes = require("./routes/retailerPaymentsRoutes");
const retailerPurchaseRoutes =require("./routes/retailerPurchases");
const retailerTrayRoutes =require("./routes/retailerTray");
const shopTrayRoutes =require("./routes/shopTray");
const dashboardRoutes =require("./routes/dashboard");
const stockSummaryRoutes =require("./routes/stockSummary");
const reportsRoutes =require("./routes/reports");


const app = express();

app.use(cors());
app.use(express.json());
app.use("/", shopRoutes);
app.use("/", supplyRoutes);
app.use("/", collectionRoutes);
app.use(retailerPaymentsRoutes);
app.use("/",retailerPurchaseRoutes);
app.use("/", retailerTrayRoutes);
app.use("/", shopTrayRoutes);
app.use("/",dashboardRoutes);
app.use("/stock-summary",stockSummaryRoutes);
app.use("/report", reportsRoutes);
app.get("/", (req, res) => {
  res.send("Egg Mart Backend Running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
