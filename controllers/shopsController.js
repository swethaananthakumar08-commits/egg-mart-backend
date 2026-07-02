const pool = require("../config/db");
const getShops = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM shops ORDER BY id"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database Error"
    });
  }
};

const getShopSummary = async (req, res) => {
  try {

    const shopId = req.params.id;

    const shopResult = await pool.query(
      `
      SELECT id, shop_name
      FROM shops
      WHERE id = $1
      `,
      [shopId]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({
        error: "Shop not found"
      });
    }

    const supplyResult = await pool.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) AS total_supply
      FROM supplies
      WHERE shop_id = $1
      `,
      [shopId]
    );

    const collectionResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount_received), 0) AS total_collection
      FROM collections
      WHERE shop_id = $1
      `,
      [shopId]
    );

    const totalSupply =
      Number(supplyResult.rows[0].total_supply);

    const totalCollection =
      Number(collectionResult.rows[0].total_collection);

    const pendingAmount =
      totalSupply - totalCollection;

    res.json({
      shop_id: shopId,
      shop_name: shopResult.rows[0].shop_name,
      total_supply: totalSupply,
      total_collection: totalCollection,
      pending_amount: pendingAmount
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

const getShopTimeLine= async (req, res) => {
  try {

    const shopId = req.params.id;

    const shopResult = await pool.query(
      `
      SELECT id, shop_name
      FROM shops
      WHERE id = $1
      `,
      [shopId]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({
        error: "Shop not found"
      });
    }

    const timelineResult = await pool.query(
      `
      SELECT
          supplied_at AS activity_time,
          'SUPPLY' AS activity_type,
          tray_count,
          total_amount,
          NULL AS notes
      FROM supplies
      WHERE shop_id = $1

      UNION ALL

      SELECT
          collected_at AS activity_time,
          'COLLECTION' AS activity_type,
          NULL AS tray_count,
          amount_received AS total_amount,
          notes
      FROM collections
      WHERE shop_id = $1

      UNION ALL

      SELECT
          transaction_time AS activity_time,
          transaction_type AS activity_type,
          tray_count,
          NULL AS total_amount,
          notes
      FROM shop_tray_transactions
      WHERE shop_id = $1

      ORDER BY activity_time DESC
      `,
      [shopId]
    );

    res.json({
      shop_id: shopId,
      shop_name: shopResult.rows[0].shop_name,
      timeline: timelineResult.rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

module.exports = {
  getShops,
  getShopSummary,
  getShopTimeLine
};
