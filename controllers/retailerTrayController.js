const pool = require("../config/db");

const createRetailerTray = async(req,res) => {
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
};

const updateRetailerTray = async(req,res) => {
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
};

const deleteRetailerTray = async(req,res) => {
  try{
    const id=req.params.id;
    
    const result= await pool.query(
      `select transaction_type,tray_count from retailer_tray_transactions where id=$1`,
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
    
    //calculate pending
    const totalPending = adjustedReceive - adjustedReturn;
    if(totalPending < 0){
      return res.status(400).json({
        error:"Cannot delete transaction. Returned trays would exceed received trays."
      });
    }
    const deleteResult = await pool.query(
      `delete from retailer_tray_transactions where id=$1 RETURNING *`,
      [id] 
    );
    return res.status(200).json({
      message:"tray deleted successfully",
      retailer_tray:deleteResult.rows[0]
    });

  }
  catch(error){
    console.log(error);
    res.status(500).json({
      error:error.message
    });
  }
};

const getRetailerTraySummary = async(req,res) => {
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

};

module.exports = {
   createRetailerTray,
   updateRetailerTray,
   deleteRetailerTray,
   getRetailerTraySummary
};