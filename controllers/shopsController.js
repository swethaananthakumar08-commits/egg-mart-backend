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

const createShops = async (req, res) => {
  try {

    const {
      shop_name,
      owner_name,
      phone,
      area
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO shops
      (shop_name, owner_name, phone, area)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [shop_name, owner_name, phone, area]
    );

    res.status(201).json({
      message: "Shop added successfully",
      shop: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
        error: error.message
    });
}
};

const getShopBalance = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
          s.id,
          s.shop_name,

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

      ORDER BY s.shop_name;
    `);

    const data = result.rows.map(shop => {

      const totalSupply =
        Number(shop.total_supply);

      const totalCollection =
        Number(shop.total_collection);

      return {
        shop_id: shop.id,
        shop_name: shop.shop_name,
        total_supply: totalSupply,
        total_collection: totalCollection,
        pending_amount:
          totalSupply - totalCollection
      };

    });

    res.json(data);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

const getShopTraySummary = async (req, res) => {

    try {

        const { shopId } = req.params;

        const shopResult = await pool.query(
        `
        SELECT
            id,
            shop_name
        FROM shops
        WHERE id=$1
        `,
        [shopId]
        );

        const sentResult = await pool.query(
`
SELECT
COALESCE(SUM(tray_count),0) AS total_sent
FROM shop_tray_transactions
WHERE shop_id=$1
AND transaction_type='SENT'
`,
[shopId]
);

const returnResult = await pool.query(
`
SELECT
COALESCE(SUM(tray_count),0) AS total_returned
FROM shop_tray_transactions
WHERE shop_id=$1
AND transaction_type='RETURN'
`,
[shopId]
);

const totalSent =
Number(sentResult.rows[0].total_sent);

const totalReturned =
Number(returnResult.rows[0].total_returned);

const trayDue =
totalSent-totalReturned;

let status;
let status_color;

if(trayDue===0){

    status="ALL TRAYS RETURNED";

    status_color="green";

}
else{

    status=`RETURN ${trayDue} TRAYS`;

    status_color="red";

}

res.json({

    shop_id:
    shopResult.rows[0].id,

    shop_name:
    shopResult.rows[0].shop_name,

    total_sent:
    totalSent,

    total_returned:
    totalReturned,

    tray_due:
    trayDue,

    status,

    status_color

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
  getShops,
  getShopSummary,
  getShopTimeLine,
  createShops,
  getShopBalance,
  getShopTraySummary
};
