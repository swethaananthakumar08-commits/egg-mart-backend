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
    //previous total Supply
    const previousSupplyResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount),0) AS previous_supply
      FROM supplies
      where shop_id=$1 AND DATE(supplied_at) < CURRENT_DATE 
      `,
      [shopId]
    );

    //previous total collection
    const previousCollectionResult = await pool.query(`
      SELECT COALESCE(SUM(amount_received),0) AS previous_collection
      FROM collections
      WHERE shop_id=$1
      AND DATE(collected_at) < CURRENT_DATE
    `,
    [shopId]
    );

    //today supply
    const todaySupplyResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS today_supply
      FROM supplies
      WHERE shop_id=$1
      AND DATE(supplied_at) = CURRENT_DATE
    `,
    [shopId]
    );

    //today collection
    const todayCollectionResult = await pool.query(
      `SELECT COALESCE(SUM(amount_received),0) AS today_collection
      FROM collections
      WHERE shop_id=$1
      AND DATE(collected_at) = CURRENT_DATE
    `,
    [shopId]
    );

    const previousPending =
      Number(previousSupplyResult.rows[0].previous_supply)
      -
      Number(previousCollectionResult.rows[0].previous_collection);

    const todaySupply = Number(todaySupplyResult.rows[0].today_supply);

    const todayCollection =
      Number(todayCollectionResult.rows[0].today_collection);

    const currentPending = previousPending + todaySupply - todayCollection;

    let status;
    let status_color;

    if(currentPending===0){

      status="NO PENDING AMOUNT";

      status_color="green";

    }
    else{

      status=`COLLECT ${currentPending} `;

      status_color="red";

    }

    res.json({
      shop_id: shopId,
      shop_name: shopResult.rows[0].shop_name,
      previous_pending: previousPending,
      today_supply: todaySupply,
      today_collection: todayCollection,
      current_pending: currentPending,
      status,
      status_color
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
      SELECT id, shop_name
      FROM shops
      WHERE id=$1
      `,
      [shopId]
    );

    if(shopResult.rows.length===0){

      return res.status(404).json({
        error:"Shop not found"
      });

    }

    // ==========================
    // PREVIOUS SENT
    // ==========================

    const previousSentResult =
      await pool.query(
        `
        SELECT
        COALESCE(SUM(tray_count),0)
        AS previous_sent

        FROM shop_tray_transactions

        WHERE shop_id=$1

        AND transaction_type='SENT'

        AND DATE(created_at)<CURRENT_DATE
        `,
        [shopId]
      );

    // ==========================
    // PREVIOUS RETURNED
    // ==========================

    const previousReturnResult =
      await pool.query(
        `
        SELECT
        COALESCE(SUM(tray_count),0)
        AS previous_return

        FROM shop_tray_transactions

        WHERE shop_id=$1

        AND transaction_type='RETURN'

        AND DATE(created_at)<CURRENT_DATE
        `,
        [shopId]
      );

    // ==========================
    // TODAY SENT
    // ==========================

    const todaySentResult =
      await pool.query(
        `
        SELECT
        COALESCE(SUM(tray_count),0)
        AS today_sent

        FROM shop_tray_transactions

        WHERE shop_id=$1

        AND transaction_type='SENT'

        AND DATE(created_at)=CURRENT_DATE
        `,
        [shopId]
      );

    // ==========================
    // TODAY RETURNED
    // ==========================

    const todayReturnResult =
      await pool.query(
        `
        SELECT
        COALESCE(SUM(tray_count),0)
        AS today_return

        FROM shop_tray_transactions

        WHERE shop_id=$1

        AND transaction_type='RETURN'

        AND DATE(created_at)=CURRENT_DATE
        `,
        [shopId]
      );

    const previousPending =

      Number(previousSentResult.rows[0].previous_sent)

      -

      Number(previousReturnResult.rows[0].previous_return);

    const todaySent =

      Number(todaySentResult.rows[0].today_sent);

    const todayReturned =

      Number(todayReturnResult.rows[0].today_return);

    const currentPending =

      previousPending +

      todaySent -

      todayReturned;

    let status;

    let status_color;

    if(currentPending===0){

      status="ALL TRAYS RETURNED";

      status_color="green";

    }

    else{

      status=`COLLECT ${currentPending} TRAYS`;

      status_color="red";

    }

    res.json({

      shop_id:
      shopResult.rows[0].id,

      shop_name:
      shopResult.rows[0].shop_name,

      previous_pending:
      previousPending,

      today_sent:
      todaySent,

      today_returned:
      todayReturned,

      current_pending:
      currentPending,

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
