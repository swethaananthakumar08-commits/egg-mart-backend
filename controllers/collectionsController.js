const pool = require("../config/db");

const getCollections = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        c.id,
        c.shop_id,
        s.shop_name,
        c.amount_received,
        c.payment_method,
        c.notes,
        c.collected_at
      FROM collections c
      JOIN shops s
      ON c.shop_id = s.id
      ORDER BY c.collected_at DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};

const createCollection = async (req, res) => {
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

    // Get total supplied amount
const supplyResult = await pool.query(
  `
  SELECT COALESCE(SUM(total_amount),0) AS total_supply
  FROM supplies
  WHERE shop_id = $1
  `,
  [shop_id]
);

// Get total collected amount
const collectionResult = await pool.query(
  `
  SELECT COALESCE(SUM(amount_received),0) AS total_collection
  FROM collections
  WHERE shop_id = $1
  `,
  [shop_id]
);

const totalSupply =
  Number(supplyResult.rows[0].total_supply);

const totalCollection =
  Number(collectionResult.rows[0].total_collection);

const pendingAmount =
  totalSupply - totalCollection;

// No pending balance
if (pendingAmount <= 0) {
  return res.status(400).json({
    error: "No pending balance for this shop"
  });
}

// Over collection
if (Number(amount_received) > pendingAmount) {
  return res.status(400).json({
    error: "Collection amount exceeds pending balance"
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
};

const updateCollection = async(req,res) => {
  try{
    const id=req.params.id;
    const {
      shop_id,
      amount_received,
      notes,
      payment_method
    } = req.body;
    if(amount_received <= 0){
      return res.status(400).json({
        error:"valid collection amount is required"
      });
    }
    // Total supplied
const supplyResult = await pool.query(
  `
  SELECT COALESCE(SUM(total_amount),0) AS total_supply
  FROM supplies
  WHERE shop_id=$1
  `,
  [shop_id]
);

// Total collected excluding current record
const collectionResult = await pool.query(
  `
  SELECT COALESCE(SUM(amount_received),0) AS total_collection
  FROM collections
  WHERE shop_id=$1
  AND id<>$2
  `,
  [shop_id, id]
);

const totalSupply =
  Number(supplyResult.rows[0].total_supply);

const totalCollection =
  Number(collectionResult.rows[0].total_collection);

const pendingAmount =
  totalSupply - totalCollection;

if (pendingAmount <= 0) {
  return res.status(400).json({
    error: "No pending balance for this shop"
  });
}

if (Number(amount_received) > pendingAmount) {
  return res.status(400).json({
    error: "Collection amount exceeds pending balance"
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
};

const deleteCollection = async(req,res) => {
  try{
    const id=req.params.id;

    const deleteResult = await pool.query(
      `delete from collections where id=$1 RETURNING *`,
      [id]
    );
    if(deleteResult.rows.length===0){
      return res.status(404).json({
        error:"collection record not found"
      });
    }
 
      return res.status(200).json({
        message:"collection record deleted successfully",
        collection: deleteResult.rows[0]
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
   getCollections,
   createCollection,
   updateCollection,
   deleteCollection
};