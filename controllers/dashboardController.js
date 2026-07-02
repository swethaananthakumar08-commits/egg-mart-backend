const pool = require("../config/db");

const getDashboard = async (req, res) => {
  try {

    // Total shops
    const totalShopsResult = await pool.query(`
      SELECT COUNT(*) AS total_shops
      FROM shops
    `);

    // Total supply amount
    const totalSupplyResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_supply
      FROM supplies
    `);

    // Total collection amount
    const totalCollectionResult = await pool.query(`
      SELECT COALESCE(SUM(amount_received), 0) AS total_collection
      FROM collections
    `);

    // Today's collection
    const todayCollectionResult = await pool.query(`
      SELECT COALESCE(SUM(amount_received), 0) AS today_collection
      FROM collections
      WHERE DATE(collected_at) = CURRENT_DATE
    `);

    // Today's purchases (trays)
    const todayPurchaseResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count), 0) AS today_purchase
      FROM retailer_purchases
      WHERE DATE(purchased_at) = CURRENT_DATE
    `);

    // Today's supplies (trays)
    const todaySupplyResult = await pool.query(`
      SELECT COALESCE(SUM(tray_count), 0) AS today_supply
      FROM supplies
      WHERE DATE(supplied_at) = CURRENT_DATE
    `);

    // Current stock
    const currentStockResult = await pool.query(`
      SELECT current_stock
      FROM stock_balance
      WHERE id = 1
    `);

    // Shops with pending balance
    const shopBalancesResult = await pool.query(`
      SELECT
        s.id,

        (
          SELECT COALESCE(SUM(sp.total_amount), 0)
          FROM supplies sp
          WHERE sp.shop_id = s.id
        ) AS total_supply,

        (
          SELECT COALESCE(SUM(c.amount_received), 0)
          FROM collections c
          WHERE c.shop_id = s.id
        ) AS total_collection

      FROM shops s
    `);

    const shopsWithPending =
      shopBalancesResult.rows.filter(shop =>
        Number(shop.total_supply) >
        Number(shop.total_collection)
      ).length;

    const totalSupply =
      Number(totalSupplyResult.rows[0].total_supply);

    const totalCollection =
      Number(totalCollectionResult.rows[0].total_collection);

    const totalPendingAmount =
      totalSupply - totalCollection;

    res.json({
      total_shops:
        Number(totalShopsResult.rows[0].total_shops),

      total_pending_amount:
        totalPendingAmount,

      shops_with_pending:
        shopsWithPending,

      today_collection:
        Number(todayCollectionResult.rows[0].today_collection),

      today_purchase:
        Number(todayPurchaseResult.rows[0].today_purchase),

      today_supply:
        Number(todaySupplyResult.rows[0].today_supply),

      current_stock:
        Number(currentStockResult.rows[0].current_stock)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

module.exports = {
   getDashboard
};