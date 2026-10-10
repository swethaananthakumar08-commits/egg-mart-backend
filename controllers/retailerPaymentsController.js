const pool = require("../config/db");

// ======================================
// GET ALL RETAILER PAYMENTS
// ======================================
const getRetailerPayments = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        id,
        amount_paid,
        payment_method,
        paid_at,
        notes,
        created_at
      FROM retailer_payments
      ORDER BY paid_at DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};


// ======================================
// CREATE RETAILER PAYMENT
// ======================================
const createRetailerPayment = async (req, res) => {
  try {

    const {
      amount_paid,
      payment_method,
      paid_at,
      notes
    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================
    if (!amount_paid || Number(amount_paid) <= 0) {
      return res.status(400).json({
        error: "Valid amount_paid is required"
      });
    }

    // ======================================
    // INSERT PAYMENT
    // ======================================
    const result = await pool.query(
      `
      INSERT INTO retailer_payments
      (
        amount_paid,
        payment_method,
        paid_at,
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
        amount_paid,
        payment_method || "CASH",
        paid_at || new Date(),
        notes || null
      ]
    );

    res.status(201).json({
      message: "Retailer payment recorded successfully",
      payment: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
};


 // ======================================
 // GET RETAILER PAYABLE SUMMARY
 // ======================================
const getRetailerPayableSummary = async (req, res) => {
  try {
    // ======================================
    // PREVIOUS PAYABLE
    // ======================================
    const previousPurchaseResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM retailer_purchases
      WHERE purchased_at < CURRENT_DATE
    `);

    const previousPaymentResult = await pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM retailer_payments
      WHERE paid_at < CURRENT_DATE
    `);

    const previousPurchases = Number(
      previousPurchaseResult.rows[0].total
    );

    const previousPayments = Number(
      previousPaymentResult.rows[0].total
    );

    const previousPayable =
      previousPurchases - previousPayments;

    // ======================================
    // TODAY'S PURCHASE
    // ======================================
    const todayPurchaseResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM retailer_purchases
      WHERE purchased_at >= CURRENT_DATE
        AND purchased_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    const todayPurchase = Number(
      todayPurchaseResult.rows[0].total
    );

    // ======================================
    // TODAY'S PAYMENT
    // ======================================
    const todayPaymentResult = await pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM retailer_payments
      WHERE paid_at >= CURRENT_DATE
        AND paid_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    const todayPayment = Number(
      todayPaymentResult.rows[0].total
    );

    // ======================================
    // CURRENT PAYABLE
    // ======================================
    const currentPayable =
      previousPayable + todayPurchase - todayPayment;

    // ======================================
    // RESPONSE
    // ======================================
    res.json({
      previous_payable: Number(previousPayable.toFixed(2)),
      today_purchase: Number(todayPurchase.toFixed(2)),
      today_payment: Number(todayPayment.toFixed(2)),
      current_payable: Number(currentPayable.toFixed(2))
    });

  } catch (error) {
    console.error("Retailer payable summary error:", error);

    res.status(500).json({
      error: "Failed to fetch retailer payable summary"
    });
  }
};


 // ======================================
 // UPDATE RETAILER PAYMENT
 // ======================================
const updateRetailerPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount_paid,
      payment_method,
      paid_at,
      notes
    } = req.body;

    // Validate payment amount
    if (
      amount_paid === undefined ||
      amount_paid === null ||
      amount_paid === "" ||
      !Number.isFinite(Number(amount_paid)) ||
      Number(amount_paid) <= 0
    ) {
      return res.status(400).json({
        error: "Valid amount_paid is required"
      });
    }

    // Update payment record
    const result = await pool.query(
      `
      UPDATE retailer_payments
      SET
        amount_paid = $1,
        payment_method = COALESCE($2, payment_method),
        paid_at = COALESCE($3, paid_at),
        notes = COALESCE($4, notes)
      WHERE id = $5
      RETURNING *
      `,
      [
        Number(amount_paid),
        payment_method || null,
        paid_at || null,
        notes === undefined ? null : notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Retailer payment not found"
      });
    }

    res.json({
      message: "Retailer payment updated successfully",
      payment: result.rows[0]
    });

  } catch (error) {
    console.error("Update retailer payment error:", error);

    res.status(500).json({
      error: "Failed to update retailer payment"
    });
  }
};


 // ======================================
 // DELETE RETAILER PAYMENT
 // ======================================
const deleteRetailerPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM retailer_payments
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Retailer payment not found"
      });
    }

    res.json({
      message: "Retailer payment deleted successfully",
      payment: result.rows[0]
    });

  } catch (error) {
    console.error("Delete retailer payment error:", error);

    res.status(500).json({
      error: "Failed to delete retailer payment"
    });
  }
};

module.exports = {
  getRetailerPayments,
  createRetailerPayment,
  getRetailerPayableSummary,
  updateRetailerPayment,
  deleteRetailerPayment
};