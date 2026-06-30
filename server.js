const express = require("express");
const pool = require("./db");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Egg Mart Backend Running 🚀");
});

app.get("/shops", async (req, res) => {
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

app.post("/supplies", async (req, res) => {
  let client;
  try {

    const {
      shop_id,
      tray_count,
      rate_per_tray
    } = req.body;

    if (!shop_id || !tray_count || !rate_per_tray) {
      return res.status(400).json({
        error: "shop_id, tray_count and rate_per_tray are required"
      });
    }
    client = await pool.connect();
    await client.query("BEGIN");

    const total_amount = tray_count * rate_per_tray;

    const stockResult = await client.query(
      `select current_stock from stock_balance `
    );

    const currentStock = Number(stockResult.rows[0].current_stock);

    if(tray_count > currentStock){
      return res.status(400).json({
      error: `Only ${currentStock} trays available in stock.`
});
    }

    const result = await client.query(
      `
      INSERT INTO supplies
      (
        shop_id,
        tray_count,
        rate_per_tray,
        total_amount
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        shop_id,
        tray_count,
        rate_per_tray,
        total_amount
      ]
    );

    await client.query(`
  UPDATE stock_balance
  SET current_stock = current_stock - $1,
      updated_at = CURRENT_TIMESTAMP
`,
[tray_count]);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Supply recorded successfully",
      supply: result.rows[0]
    });

  } catch (error) {
    if(client){
      await client.query("ROLLBACK");
    }

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
  finally{
    if(client){
      client.release();
    }
  }
});

app.post("/collections", async (req, res) => {
  try {

    const {
      shop_id,
      amount_received,
      notes,
      payment_method
    } = req.body;

    if (!shop_id || !amount_received) {
      return res.status(400).json({
        error: "shop_id and amount_received are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO collections
      (
        shop_id,
        amount_received,
        notes,
        payment_method
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        shop_id,
        amount_received,
        notes,
        payment_method
      ]
    );

    res.status(201).json({
      message: "Collection recorded successfully",
      collection: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
});

app.get("/shop-summary/:id", async (req, res) => {
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


app.post("/retailer-purchases", async (req, res) => {
  let client;
  try {

    client = await pool.connect();
    await client.query("BEGIN");

    const {
      tray_count,
      rate_per_tray
    } = req.body;

    if (!tray_count || !rate_per_tray) {
      return res.status(400).json({
        error: "tray_count and rate_per_tray are required"
      });
    }

    const total_amount =
      tray_count * rate_per_tray;

    const result = await client.query(
      `
      INSERT INTO retailer_purchases
      (
        tray_count,
        rate_per_tray,
        total_amount
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING *
      `,
      [
        tray_count,
        rate_per_tray,
        total_amount
      ]
    );

    await client.query(`
      UPDATE stock_balance
      SET current_stock = current_stock + $1,
          updated_at = CURRENT_TIMESTAMP
    `,
    [tray_count]);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Purchase recorded successfully",
      purchase: result.rows[0]
    });

  } catch (error) {
    if(client){
    await client.query("ROLLBACK");
}
    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
  finally{
    if(client){
      client.release();

    }
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

app.post("/shop-tray", async (req, res) => {

    try {

        const {
            shop_id,
            transaction_type,
            tray_count,
            notes
        } = req.body;

        // Business logic comes here
       if (
    shop_id == null ||
    !transaction_type ||
    tray_count == null ||
    tray_count <= 0
) {
    return res.status(400).json({
        error: "Valid shop_id, transaction_type and tray_count are required"
    });
}
if(transaction_type === "SENT"){

    // Save directly
    

    const result = await pool.query(
      `
      INSERT INTO shop_tray_transactions
      (
        shop_id,
        transaction_type,
        tray_count,
        notes
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        shop_id,
        transaction_type,
        tray_count,
        notes
      ]
    );

    return res.status(201).json({
      message: "Tray transaction recorded successfully",
      transaction: result.rows[0]
    });

}

else if(transaction_type === "RETURN"){

    // Check pending trays first
    const sentResult = await pool.query(
  `
  SELECT COALESCE(SUM(tray_count),0) AS total_sent
  FROM shop_tray_transactions
  WHERE shop_id = $1
  AND transaction_type = 'SENT'
  `,
  [shop_id]
);

const returnResult = await pool.query(
  `
  SELECT COALESCE(SUM(tray_count),0) AS total_returned
  FROM shop_tray_transactions
  WHERE shop_id = $1
  AND transaction_type = 'RETURN'
  `,
  [shop_id]
);

const totalSent =
  Number(sentResult.rows[0].total_sent);

const totalReturned =
  Number(returnResult.rows[0].total_returned);

const currentDue =
  totalSent - totalReturned;


if (tray_count > currentDue) {

    return res.status(400).json({
        error: `Only ${currentDue} trays are pending for this shop.`
    });

}
const result = await pool.query(
  `
  INSERT INTO shop_tray_transactions
  (
    shop_id,
    transaction_type,
    tray_count,
    notes
  )
  VALUES
  (
    $1,
    $2,
    $3,
    $4
  )
  RETURNING *
  `,
  [
    shop_id,
    transaction_type,
    tray_count,
    notes
  ]
);

return res.status(201).json({
    message: "Tray returned successfully",
    transaction: result.rows[0]
});
}


else{

    return res.status(400).json({
        error:"Invalid transaction type"
    });

}

    }
    catch(error){

        console.error(error);

        res.status(500).json({
            error:error.message
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

app.post("/retailer-tray", async(req,res) => {
  try{
    const{
      transaction_type,
      tray_count,
      notes
    } =req.body;

    //validate
    if(!transaction_type || tray_count==null || tray_count <=0|| !["RECEIVED", "RETURN"].includes(transaction_type)){
      return res.status(400).json({
        error:"valid transaction_type and tray_count are required"
      });
    }

    // if received then insert directly
    if(transaction_type==="RECEIVED"){
      const result = await pool.query(
        `insert into retailer_tray_transactions(transaction_type,tray_count,notes)
        values($1,$2,$3)
        RETURNING *
        `,[transaction_type,
          tray_count,
          notes
        ]
      );

      return res.status(200).json({
        message: "record added succesfully",
        transaction: result.rows[0]
      });
    }
    else if(transaction_type==="RETURN"){
      // Check pending trays first
    const receiveResult = await pool.query(
  `
  SELECT COALESCE(SUM(tray_count),0) AS total_receive
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RECEIVED'
  `
);

const returnResult = await pool.query(
  `
  SELECT COALESCE(SUM(tray_count),0) AS total_returned
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RETURN'
  `
);

const totalReceive =
  Number(receiveResult.rows[0].total_receive);

const totalReturned =
  Number(returnResult.rows[0].total_returned);

const currentDue =
  totalReceive - totalReturned;


if (tray_count > currentDue) {

    return res.status(400).json({
        error: `Only ${currentDue} trays are pending to return.`
    });

}
const result = await pool.query(
  `
  INSERT INTO retailer_tray_transactions
  (
    transaction_type,
    tray_count,
    notes
  )
  VALUES
  (
    $1,
    $2,
    $3
  )
  RETURNING *
  `,
  [
    transaction_type,
    tray_count,
    notes
  ]
);

return res.status(200).json({
    message: "Tray returned successfully",
    transaction: result.rows[0]
});
}


else{

    return res.status(400).json({
        error:"Invalid transaction type"
    });

}
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

app.put("/supplies/:id", async(req,res) => {
  let client;
  try{
    //get supply id
    const id = req.params.id;
    //get data
    const{
      tray_count,
      rate_per_tray
    } = req.body;
    //validate
    if(tray_count <= 0 || rate_per_tray <= 0){
      return res.status(400).json({
            error:"valid tray_count and rate_per_tray are required"
      });
    }
    //fetch exisiting supply records
    const result = await pool.query(
      `select *from supplies where id=$1`,
      [id]
    );
    //check for valid supply_id
    if(result.rows.length===0){
      return res.status(404).json({
        error:"supply record not found"
      });
    }
    const oldTrayCount = Number(result.rows[0].tray_count);
    
    const difference = oldTrayCount - tray_count;

    const stockResult = await pool.query(
      `select current_stock from stock_balance`
    );

    const currentStock = Number(stockResult.rows[0].current_stock);

    const newStock = currentStock + difference;
    if(newStock < 0){
      return res.status(400).json({
        error:"insufficient stock for update"
      });
    }
    const newTotalAmount = tray_count * rate_per_tray;
    //transaction
    client = await pool.connect();
    await client.query("BEGIN");
    const updateResult = await client.query(
      `update supplies set tray_count=$1, rate_per_tray=$2, total_amount=$3 where id=$4 RETURNING *`,
      [tray_count,
      rate_per_tray,
      newTotalAmount,
      id]
    );
    await client.query(
      `update stock_balance set current_stock=$1 ,updated_at =CURRENT_TIMESTAMP`,
      [newStock]
    );
    await client.query("COMMIT");
    return res.status(200).json({
      message: "Supply updated successfully",
      transaction: updateResult.rows[0]
});

  }
  catch(error){
    console.error(error);
    if(client){
      await client.query("ROLLBACK");
    }
    res.status(500).json({
      error:error.message
    });
  }
  finally{
    if(client){
      client.release();
    }
  }
});

app.put("/collections/:id", async(req,res) => {
  try{
    const id=req.params.id;
    const {
      amount_received,
      notes,
      payment_method
    } = req.body;
    if(amount_received <= 0){
      return res.status(400).json({
        error:"valid collection amount is required"
      });
    }
    const result = await pool.query(
      `select *from collections where id=$1`,
      [id]
    );
    if(result.rows.length===0){
      return res.status(404).json({
        error:"collection record not found"
      });
    }
    const updateResult= await pool.query(
        `update collections set amount_received =$1, notes=$2,payment_method=$3 where id=$4 RETURNING *`,
        [amount_received,
         notes,
         payment_method,
          id
        ]
      );
      return res.status(200).json({
        message:"collection record updated successfully",
        collection: updateResult.rows[0]
      });

  }
  catch(error){
    console.error(error);
    res.status(500).json({
      error:error.message
    });
  }
});

app.put("/retailer-purchases/:id", async(req,res) => {
  let client;
  try{
    //get purchase id
    const id = req.params.id;
    //get data
    const{
      tray_count,
      rate_per_tray
    } = req.body;
    //validate
    if(tray_count <= 0 || rate_per_tray <= 0){
      return res.status(400).json({
            error:"valid tray_count and rate_per_tray are required"
      });
    }
    //fetch exisiting purchase records
    const result = await pool.query(
      `select *from retailer_purchases where id=$1`,
      [id]
    );
    //check for valid supply_id
    if(result.rows.length===0){
      return res.status(404).json({
        error:"purchase record not found"
      });
    }
    const oldTrayCount = Number(result.rows[0].tray_count);
    
    const difference = tray_count - oldTrayCount;

    const stockResult = await pool.query(
      `select current_stock from stock_balance`
    );

    const currentStock = Number(stockResult.rows[0].current_stock);

    const newStock = currentStock + difference;
    if(newStock < 0){
      return res.status(400).json({
        error:"insufficient stock for update"
      });
    }
    const newTotalAmount = tray_count * rate_per_tray;
    //transaction
    client = await pool.connect();
    await client.query("BEGIN");
    const updateResult = await client.query(
      `update retailer_purchases set tray_count=$1, rate_per_tray=$2, total_amount=$3 where id=$4 RETURNING *`,
      [tray_count,
      rate_per_tray,
      newTotalAmount,
      id]
    );
    await client.query(
      `update stock_balance set current_stock=$1 ,updated_at =CURRENT_TIMESTAMP`,
      [newStock]
    );
    await client.query("COMMIT");
    return res.status(200).json({
      message: "purchase updated successfully",
      transaction: updateResult.rows[0]
});

  }
  catch(error){
    console.error(error);
    if(client){
      await client.query("ROLLBACK");
    }
    res.status(500).json({
      error:error.message
    });
  }
  finally{
    if(client){
      client.release();
    }
  }
});

app.put("/retailer-tray/:id", async(req,res) => {
  try{
    const id=req.params.id;
    const {
      transaction_type,
      tray_count,
      notes
    } = req.body;
    //validate
    if(!transaction_type || tray_count==null || tray_count <=0|| !["RECEIVED", "RETURN"].includes(transaction_type)){
      return res.status(400).json({
        error:"valid transaction_type and tray_count are required"
      });
    }
    const result= await pool.query(
      `select transaction_type,tray_count,notes from retailer_tray_transactions where id=$1`,
      [id]
    );
    if(result.rows.length===0){
      return res.status(404).json({
        error:"retailer tray record not found"
      });
    }
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
    //fetch old data
    const oldType = result.rows[0].transaction_type;
    const oldTrayCount = Number(result.rows[0].tray_count);
    // get the copies of totals
    let adjustedReceive = totalReceive;
    let adjustedReturn = totalReturn;
    //remove old effect
    if(oldType==="RECEIVED"){
      adjustedReceive = adjustedReceive - oldTrayCount;
    }
    if(oldType==="RETURN"){
      adjustedReturn = adjustedReturn - oldTrayCount;
    }
    //apply new effect
    if(transaction_type==="RECEIVED"){
      adjustedReceive = adjustedReceive + tray_count;
    }
    if(transaction_type==="RETURN"){
      adjustedReturn = adjustedReturn + tray_count;
    }
    //calculate pending
    const totalPending = adjustedReceive - adjustedReturn;
    if(totalPending < 0){
      return res.status(400).json({
        error:"insufficient amount of trays"
      });
    }
    const updateResult = await pool.query(
      `update retailer_tray_transactions set transaction_type=$1,tray_count=$2,notes=$3 where id=$4 RETURNING *`,
      [transaction_type,
        tray_count,
        notes,
        id
      ]
    );
    return res.status(200).json({
      message:"tray updated successfully",
      retailer_tray:updateResult.rows[0]
    });

  }
  catch(error){
    console.log(error);
    res.status(500).json({
      error:error.message
    });
  }
});

app.put("/shop-tray/:id", async(req,res) => {
  try{
    const id=req.params.id;
    const {
      transaction_type,
      tray_count,
      notes
    } = req.body;
    //validate
    if(!transaction_type || tray_count==null || tray_count <=0|| !["SENT", "RETURN"].includes(transaction_type)){
      return res.status(400).json({
        error:"valid transaction_type and tray_count are required"
      });
    }
    const result= await pool.query(
      `select shop_id,transaction_type,tray_count,notes from shop_tray_transactions where id=$1`,
      [id]
    );
    if(result.rows.length===0){
      return res.status(404).json({
        error:"shop tray record not found"
      });
    }
    const shopId = Number(result.rows[0].shop_id);
    //total_sent
    const sentResult = await pool.query(
      `select coalesce(SUM(tray_count),0) as total_sent from shop_tray_transactions
      where shop_id=$1 AND transaction_type='SENT'`,
      [shopId]
    );
    //total_returned
    const returnResult = await pool.query(
      `select coalesce(SUM(tray_count),0) as total_return from shop_tray_transactions
      where shop_id=$1 AND transaction_type ='RETURN'`,
      [shopId]
    );

    //get the receive , return to calculate the pending 

    const totalSent = Number(sentResult.rows[0].total_sent);

    const totalReturn = Number(returnResult.rows[0].total_return);
    //fetch old data
    const oldType = result.rows[0].transaction_type;
    const oldTrayCount = Number(result.rows[0].tray_count);
    // get the copies of totals
    let adjustedSent = totalSent;
    let adjustedReturn = totalReturn;
    //remove old effect
    if(oldType==="SENT"){
      adjustedSent = adjustedSent - oldTrayCount;
    }
    if(oldType==="RETURN"){
      adjustedReturn = adjustedReturn - oldTrayCount;
    }
    //apply new effect
    if(transaction_type==="SENT"){
      adjustedSent = adjustedSent + tray_count;
    }
    if(transaction_type==="RETURN"){
      adjustedReturn = adjustedReturn + tray_count;
    }
    //calculate pending
    const totalPending = adjustedSent - adjustedReturn;
    if(totalPending < 0){
      return res.status(400).json({
        error:"insufficient amount of trays"
      });
    }
    const updateResult = await pool.query(
      `update shop_tray_transactions set transaction_type=$1,tray_count=$2,notes=$3 where id=$4 RETURNING *`,
      [transaction_type,
        tray_count,
        notes,
        id
      ]
    );
    return res.status(200).json({
      message:"tray updated successfully",
      shop_tray:updateResult.rows[0]
    });

  }
  catch(error){
    console.log(error);
    res.status(500).json({
      error:error.message
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
