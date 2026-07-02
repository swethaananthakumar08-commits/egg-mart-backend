const express = require("express");
const pool = require("./config/db");
const shopRoutes = require("./routes/shops");
const supplyRoutes = require("./routes/supplies");
const collectionRoutes =require("./routes/collections");
const retailerPurchaseRoutes =require("./routes/retailerPurchases");
const retailerTrayRoutes =require("./routes/retailerTray");
const shopTrayRoutes =require("./routes/shopTray");
const app = express();

app.use(express.json());
app.use("/", shopRoutes);
app.use("/", supplyRoutes);
app.use("/", collectionRoutes);
app.use("/",retailerPurchaseRoutes);
app.use("/", retailerTrayRoutes);
app.use("/", shopTrayRoutes);

app.get("/", (req, res) => {
  res.send("Egg Mart Backend Running 🚀");
});

app.post("/shops", async (req, res) => {
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
});

app.get("/all-shop-balances", async (req, res) => {
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
});

app.get("/dashboard", async (req, res) => {
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
});

app.get("/shop-tray-summary/:shopId", async (req, res) => {

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

});

app.get("/retailer-tray-summary", async(req,res) => {
  try{
    //total_received
    const receiveResult = await pool.query(
      `select coalesce(SUM(tray_count),0) as total_receive from retailer_tray_transactions
      where transaction_type='RECEIVED'`
    );
    //total_returned
    const returnResult = await pool.query(
      `select coalesce(SUM(tray_count),0) as total_return from retailer_tray_transactions
      where transaction_type ='RETURN'`
    );

    //get the receive , return to calculate the pending 

    const totalReceive = Number(receiveResult.rows[0].total_receive);

    const totalReturn = Number(returnResult.rows[0].total_return);

    const trayDue = totalReceive - totalReturn;

    //for status 
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
    total_received:
    totalReceive,

    total_returned:
    totalReturn,

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

});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
