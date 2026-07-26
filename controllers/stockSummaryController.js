const pool = require("../config/db");

const getStockSummary = async (req, res) => {

  try {

    // ==========================
    // PREVIOUS PURCHASE
    // ==========================
    const previousPurchaseResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count),0) AS previous_purchase
      FROM retailer_purchases
      WHERE DATE(purchased_at) < CURRENT_DATE
    `);

    // ==========================
    // PREVIOUS SUPPLY
    // ==========================
    const previousSupplyResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count),0) AS previous_supply
      FROM supplies
      WHERE DATE(supplied_at) < CURRENT_DATE
    `);

    // ==========================
    // TODAY PURCHASE
    // ==========================
    const todayPurchaseResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count),0) AS today_purchase
      FROM retailer_purchases
      WHERE DATE(purchased_at)=CURRENT_DATE
    `);

    // ==========================
    // TODAY SUPPLY
    // ==========================
    const todaySupplyResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count),0) AS today_supply
      FROM supplies
      WHERE DATE(supplied_at)=CURRENT_DATE
    `);

    const previousStock =
      Number(previousPurchaseResult.rows[0].previous_purchase)
      -
      Number(previousSupplyResult.rows[0].previous_supply);

    const todayPurchase =
      Number(todayPurchaseResult.rows[0].today_purchase);

    const todaySupply =
      Number(todaySupplyResult.rows[0].today_supply);

    const currentStock =
      previousStock +
      todayPurchase -
      todaySupply;

    res.json({

      previous_stock:
        previousStock,

      today_purchase:
        todayPurchase,

      today_supply:
        todaySupply,

      current_stock:
        currentStock

    });

  }
  catch(error){

    console.error(error);

    res.status(500).json({
      error:error.message
    });

  }

};

module.exports = {
  getStockSummary
};