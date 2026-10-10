const pool = require("../config/db");

const getRetailerPurchases = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        id,
        tray_count,
        rate_per_tray,
        total_amount,
        purchased_at
      FROM retailer_purchases
      ORDER BY purchased_at DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

const createRetailerPurchase = async (req, res) => {
  let client;
  try {

    const {
      tray_count,
      rate_per_tray
    } = req.body;

    if (!tray_count || !rate_per_tray) {
      return res.status(400).json({
        error: "tray_count and rate_per_tray are required"
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");


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
};

const updateRetailerPurchase = async(req,res) => {
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
};

const deleteRetailerPurchase = async(req,res) => {
  let client;
  try{
    //get purchase id
    const id = req.params.id;
    
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
    
    const stockResult = await pool.query(
      `select current_stock from stock_balance`
    );

    const currentStock = Number(stockResult.rows[0].current_stock);

    const newStock = currentStock - oldTrayCount;
    if(newStock < 0){
      return res.status(400).json({
        error:"insufficient stock for delete"
      });
    }
   
    //transaction
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `update stock_balance set current_stock=$1 ,updated_at =CURRENT_TIMESTAMP`,
      [newStock]
    );
    const deleteResult = await client.query(
      `delete from retailer_purchases where id=$1 RETURNING *`,
      [id]
    );
    
    await client.query("COMMIT");
    return res.status(200).json({
      message: "purchase deleted successfully",
      purchase: deleteResult.rows[0]
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
};

module.exports = {
  getRetailerPurchases,
   createRetailerPurchase,
   updateRetailerPurchase,
   deleteRetailerPurchase
};