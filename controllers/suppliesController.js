const pool = require("../config/db");

const getSupplies = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        s.id,
        s.shop_id,
        sh.shop_name,
        s.tray_count,
        s.rate_per_tray,
        s.total_amount,
        s.supplied_at
      FROM supplies s
      JOIN shops sh
      ON s.shop_id = sh.id
      ORDER BY s.supplied_at DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

const createSupply = async (req, res) => {
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
};

const updateSupply = async(req,res) => {
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
      purchase: updateResult.rows[0]
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

const deleteSupply = async(req,res) => {
  let client;
  try{
    //get supply id
    const id = req.params.id;
  
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

    const stockResult = await pool.query(
      `select current_stock from stock_balance`
    );

    const currentStock = Number(stockResult.rows[0].current_stock);

    const newStock = currentStock + oldTrayCount;
   
    //transaction
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `update stock_balance set current_stock=$1 ,updated_at =CURRENT_TIMESTAMP`,
      [newStock]
    );
    const deleteResult = await client.query(
      `delete from supplies where id=$1 RETURNING *`,
      [id]
    );
    
    await client.query("COMMIT");
    return res.status(200).json({
      message: "Supply deleted successfully",
      supply: deleteResult.rows[0]
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
  getSupplies,
   createSupply,
   updateSupply,
   deleteSupply
};