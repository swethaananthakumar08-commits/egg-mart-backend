const pool = require("../config/db");

const createShopTray = async (req, res) => {

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

};

const updateShopTray = async(req,res) => {
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
};

const deleteShopTray = async(req,res) => {
  try{
    const id=req.params.id;
    
    const result= await pool.query(
      `select shop_id,transaction_type,tray_count from shop_tray_transactions where id=$1`,
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
    
    //calculate pending
    const totalPending = adjustedSent - adjustedReturn;
    if(totalPending < 0){
      return res.status(400).json({
        error:"Cannot delete transaction. Returned trays would exceed received trays."
      });
    }
    const deleteResult = await pool.query(
      `delete from shop_tray_transactions where id=$1 RETURNING *`,
      [id]
    );
    return res.status(200).json({
      message:"tray deleted successfully",
      shop_tray:deleteResult.rows[0]
    });

  }
  catch(error){
    console.log(error);
    res.status(500).json({
      error:error.message
    });
  }
};

module.exports = {
   createShopTray,
   updateShopTray,
   deleteShopTray
};