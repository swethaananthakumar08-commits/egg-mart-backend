const pool = require("../config/db");

// ======================================
// TODAY BUSINESS REPORT
// ======================================
const getTodayBusinessReport = async (req, res) => {

  try {

    // ======================================
// TODAY PURCHASE
// ======================================

const todayPurchaseResult = await pool.query(`
SELECT
COALESCE(SUM(tray_count),0) AS today_purchase
FROM retailer_purchases
WHERE DATE(purchased_at)=CURRENT_DATE
`);

    // ======================================
// TODAY SUPPLY
// ======================================

const todaySupplyResult = await pool.query(`
SELECT
COALESCE(SUM(tray_count),0) AS today_supply
FROM supplies
WHERE DATE(supplied_at)=CURRENT_DATE
`);
    // ======================================
// CURRENT STOCK
// ======================================

const stockResult = await pool.query(`
SELECT
current_stock
FROM stock_balance
LIMIT 1
`);

// ======================================
// PREVIOUS SALES
// ======================================

const previousSalesResult = await pool.query(`
  SELECT
    COALESCE(SUM(total_amount), 0) AS previous_sales
  FROM supplies
  WHERE DATE(supplied_at) < CURRENT_DATE
`);

// ======================================
// PREVIOUS COLLECTION
// ======================================

const previousCollectionResult = await pool.query(`
  SELECT
    COALESCE(SUM(amount_received), 0) AS previous_collection
  FROM collections
  WHERE DATE(collected_at) < CURRENT_DATE
`);

// ======================================
// TODAY SALES
// ======================================

const todaySalesResult = await pool.query(`
  SELECT
    COALESCE(SUM(total_amount), 0) AS today_sales
  FROM supplies
  WHERE DATE(supplied_at) = CURRENT_DATE
`);

// ======================================
// TODAY COLLECTION
// ======================================

const todayCollectionResult = await pool.query(`
  SELECT
    COALESCE(SUM(amount_received), 0) AS today_collection
  FROM collections
  WHERE DATE(collected_at) = CURRENT_DATE
`);

const todayPurchaseCostResult = await pool.query(`
  SELECT
  COALESCE(SUM(total_amount), 0) AS today_purchase_cost
FROM retailer_purchases
WHERE DATE(purchased_at) = CURRENT_DATE
  `);



    // ======================================
    // RETAILER PAYABLE - PREVIOUS PURCHASES
    // ======================================
    const previousRetailerPurchaseCostResult = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) AS previous_purchase_cost
      FROM retailer_purchases
      WHERE purchased_at < CURRENT_DATE
    `);

    // ======================================
    // RETAILER PAYABLE - PREVIOUS PAYMENTS
    // ======================================
    const previousRetailerPaymentResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount_paid), 0) AS previous_payment
      FROM retailer_payments
      WHERE paid_at < CURRENT_DATE
    `);

    // ======================================
    // RETAILER PAYABLE - TODAY PAYMENTS
    // ======================================
    const todayRetailerPaymentResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount_paid), 0) AS today_payment
      FROM retailer_payments
      WHERE paid_at >= CURRENT_DATE
        AND paid_at < CURRENT_DATE + INTERVAL '1 day'
    `);


  // ======================================
// TODAY CASH COLLECTION
// ======================================

const cashCollectionResult = await pool.query(`
  SELECT
    COALESCE(SUM(amount_received), 0) AS cash_collection
  FROM collections
  WHERE DATE(collected_at) = CURRENT_DATE
  AND payment_method = 'CASH'
`);


// ======================================
// TODAY GPAY COLLECTION
// ======================================

const gpayCollectionResult = await pool.query(`
  SELECT
    COALESCE(SUM(amount_received), 0) AS gpay_collection
  FROM collections
  WHERE DATE(collected_at) = CURRENT_DATE
  AND payment_method = 'GPAY'
`);

// ======================================
// TODAY SHOP-WISE ACTIVITY
// ======================================

const shopActivityResult = await pool.query(`
  SELECT
    s.id AS shop_id,
    s.shop_name,

    COALESCE(SUM(sp.tray_count), 0) AS trays_supplied,

    COALESCE(SUM(sp.total_amount), 0) AS sales_amount

  FROM shops s

  INNER JOIN supplies sp
    ON s.id = sp.shop_id
    AND DATE(sp.supplied_at) = CURRENT_DATE

  GROUP BY
    s.id,
    s.shop_name

  ORDER BY
    s.shop_name
`);

// ======================================
// TODAY SHOP-WISE COLLECTION
// ======================================

const shopCollectionResult = await pool.query(`
  SELECT
    s.id AS shop_id,
    COALESCE(SUM(c.amount_received), 0) AS collected_amount

  FROM shops s

  INNER JOIN collections c
    ON s.id = c.shop_id
    AND DATE(c.collected_at) = CURRENT_DATE

  GROUP BY s.id
`);

// ======================================
// RETAILER TRAYS - PREVIOUS RECEIVED
// ======================================

const previousRetailerReceivedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS previous_received
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RECEIVED'
  AND DATE(created_at) < CURRENT_DATE
`);


// ======================================
// RETAILER TRAYS - PREVIOUS RETURNED
// ======================================

const previousRetailerReturnedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS previous_returned
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RETURN'
  AND DATE(created_at) < CURRENT_DATE
`);


// ======================================
// RETAILER TRAYS - TODAY RECEIVED
// ======================================

const todayRetailerReceivedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS today_received
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RECEIVED'
  AND DATE(created_at) = CURRENT_DATE
`);


// ======================================
// RETAILER TRAYS - TODAY RETURNED
// ======================================

const todayRetailerReturnedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS today_returned
  FROM retailer_tray_transactions
  WHERE transaction_type = 'RETURN'
  AND DATE(created_at) = CURRENT_DATE
`);

// ======================================
// SHOP TRAYS - PREVIOUS SENT
// ======================================

const previousShopSentResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS previous_sent
  FROM shop_tray_transactions
  WHERE transaction_type = 'SENT'
  AND DATE(created_at) < CURRENT_DATE
`);


// ======================================
// SHOP TRAYS - PREVIOUS RETURNED
// ======================================

const previousShopReturnedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS previous_returned
  FROM shop_tray_transactions
  WHERE transaction_type = 'RETURN'
  AND DATE(created_at) < CURRENT_DATE
`);


// ======================================
// SHOP TRAYS - TODAY SENT
// ======================================

const todayShopSentResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS today_sent
  FROM shop_tray_transactions
  WHERE transaction_type = 'SENT'
  AND DATE(created_at) = CURRENT_DATE
`);


// ======================================
// SHOP TRAYS - TODAY RETURNED
// ======================================

const todayShopReturnedResult = await pool.query(`
  SELECT COALESCE(SUM(tray_count), 0) AS today_returned
  FROM shop_tray_transactions
  WHERE transaction_type = 'RETURN'
  AND DATE(created_at) = CURRENT_DATE
`);

// ======================================
// SHOP-WISE TRAY BREAKDOWN
// Previous Pending + Today Movement
// ======================================

const shopTrayBreakdownResult = await pool.query(`
  SELECT
    s.id AS shop_id,
    s.shop_name,

    -- Previous Sent
    COALESCE(
      SUM(
        CASE
          WHEN st.transaction_type = 'SENT'
          AND DATE(st.created_at) < CURRENT_DATE
          THEN st.tray_count
          ELSE 0
        END
      ), 0
    ) AS previous_sent,

    -- Previous Returned
    COALESCE(
      SUM(
        CASE
          WHEN st.transaction_type = 'RETURN'
          AND DATE(st.created_at) < CURRENT_DATE
          THEN st.tray_count
          ELSE 0
        END
      ), 0
    ) AS previous_returned,

    -- Today Sent
    COALESCE(
      SUM(
        CASE
          WHEN st.transaction_type = 'SENT'
          AND DATE(st.created_at) = CURRENT_DATE
          THEN st.tray_count
          ELSE 0
        END
      ), 0
    ) AS today_sent,

    -- Today Returned
    COALESCE(
      SUM(
        CASE
          WHEN st.transaction_type = 'RETURN'
          AND DATE(st.created_at) = CURRENT_DATE
          THEN st.tray_count
          ELSE 0
        END
      ), 0
    ) AS today_returned

  FROM shops s

  INNER JOIN shop_tray_transactions st
    ON s.id = st.shop_id

  GROUP BY
    s.id,
    s.shop_name

  ORDER BY
    s.shop_name
`);

const shopTrayBreakdown =
  shopTrayBreakdownResult.rows.map((shop) => {

    const previousSent =
      Number(shop.previous_sent);

    const previousReturned =
      Number(shop.previous_returned);

    const todaySent =
      Number(shop.today_sent);

    const todayReturned =
      Number(shop.today_returned);

    // Pending trays at the START of today
    const previousPending =
      previousSent - previousReturned;

    // Pending trays RIGHT NOW
    const currentPending =
      previousPending
      + todaySent
      - todayReturned;

    return {

      shop_id:
        Number(shop.shop_id),

      shop_name:
        shop.shop_name,

      previous_pending:
        previousPending,

      today_sent:
        todaySent,

      today_returned:
        todayReturned,

      current_pending:
        currentPending

    };

  });

const shopActivity = shopActivityResult.rows.map((shop) => {

  const collection =
    shopCollectionResult.rows.find(
      (item) =>
        Number(item.shop_id) === Number(shop.shop_id)
    );

  return {

    shop_id:
      Number(shop.shop_id),

    shop_name:
      shop.shop_name,

    trays_supplied:
      Number(shop.trays_supplied),

    sales_amount:
      Number(shop.sales_amount),

    collected_amount:
      collection
        ? Number(collection.collected_amount)
        : 0

  };

});

const previousPending =
  Number(previousSalesResult.rows[0].previous_sales)
  -
  Number(previousCollectionResult.rows[0].previous_collection);

const todaySales =
  Number(todaySalesResult.rows[0].today_sales);

const todayCollection =
  Number(todayCollectionResult.rows[0].today_collection);

  const currentPending =
  previousPending
  + todaySales
  - todayCollection;


    const todayPurchase =
Number(todayPurchaseResult.rows[0].today_purchase);

const todaySupply =
Number(todaySupplyResult.rows[0].today_supply);

const closingStock =
Number(stockResult.rows[0].current_stock);

const openingStock =
closingStock
-
todayPurchase
+
todaySupply;

const todayPurchaseCost =
  Number(todayPurchaseCostResult.rows[0].today_purchase_cost);


    // ======================================
    // RETAILER PAYABLE CALCULATIONS
    // ======================================
    const previousRetailerPurchaseCost = Number(
      previousRetailerPurchaseCostResult.rows[0].previous_purchase_cost
    );

    const previousRetailerPayments = Number(
      previousRetailerPaymentResult.rows[0].previous_payment
    );

    const todayRetailerPayment = Number(
      todayRetailerPaymentResult.rows[0].today_payment
    );

    const previousRetailerPayable =
      previousRetailerPurchaseCost - previousRetailerPayments;

    const currentRetailerPayable =
      previousRetailerPayable +
      todayPurchaseCost -
      todayRetailerPayment;


  const cashCollection =
  Number(cashCollectionResult.rows[0].cash_collection);

const gpayCollection =
  Number(gpayCollectionResult.rows[0].gpay_collection);

  const previousRetailerPending =
  Number(
    previousRetailerReceivedResult.rows[0].previous_received
  )
  -
  Number(
    previousRetailerReturnedResult.rows[0].previous_returned
  );

const todayRetailerReceived =
  Number(
    todayRetailerReceivedResult.rows[0].today_received
  );

const todayRetailerReturned =
  Number(
    todayRetailerReturnedResult.rows[0].today_returned
  );

const currentRetailerPending =
  previousRetailerPending
  + todayRetailerReceived
  - todayRetailerReturned;

  const previousShopTrayPending =
  Number(previousShopSentResult.rows[0].previous_sent)
  -
  Number(previousShopReturnedResult.rows[0].previous_returned);

const todayShopTraySent =
  Number(todayShopSentResult.rows[0].today_sent);

const todayShopTrayReturned =
  Number(todayShopReturnedResult.rows[0].today_returned);

const currentShopTrayPending =
  previousShopTrayPending
  + todayShopTraySent
  - todayShopTrayReturned;

res.json({

  // =========================
  // STOCK
  // =========================

  opening_stock: openingStock,
  today_purchase: todayPurchase,
  today_supply: todaySupply,
  closing_stock: closingStock,

  // =========================
  // MONEY
  // =========================

  previous_pending: previousPending,
  today_sales: todaySales,
  today_collection: todayCollection,
  current_pending: currentPending,

  today_purchase_cost: todayPurchaseCost,

  
    // =========================
    // RETAILER PAYABLE
    // =========================
    retailer_payable: {
      previous_payable: Number(previousRetailerPayable.toFixed(2)),
      today_purchase: Number(todayPurchaseCost.toFixed(2)),
      today_payment: Number(todayRetailerPayment.toFixed(2)),
      current_payable: Number(currentRetailerPayable.toFixed(2))
    },


  // =========================
  // PAYMENT
  // =========================

  cash_collection: cashCollection,
  gpay_collection: gpayCollection,

  // =========================
  // SHOP ACTIVITY
  // =========================

  shop_activity: shopActivity,

  // =========================
  // RETAILER TRAYS
  // =========================

  retailer_trays: {
    previous_pending: previousRetailerPending,
    today_received: todayRetailerReceived,
    today_returned: todayRetailerReturned,
    current_pending: currentRetailerPending
  },

  // =========================
  // SHOP TRAYS
  // =========================

  shop_trays: {
    previous_pending: previousShopTrayPending,
    today_sent: todayShopTraySent,
    today_returned: todayShopTrayReturned,
    current_pending: currentShopTrayPending
  },

  // =========================
  // SHOP-WISE TRAYS
  // =========================

  shop_tray_breakdown: shopTrayBreakdown

});
    

  }
  catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

};

module.exports = {
  getTodayBusinessReport
};