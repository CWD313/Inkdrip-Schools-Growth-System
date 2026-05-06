require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Frontend HTML/CSS/Images serve karne ke liye
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Razorpay Setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==========================================
// 1. ORDER CREATE KARNA (PRICE ₹299 FIXED)
// ==========================================
app.post('/api/create-order', async (req, res) => {
    try {
        // NAYI PRICE: ₹299
        const BOOK_PRICE_INR = 299; 
        
        const options = {
            amount: BOOK_PRICE_INR * 100, // Paise me convert (29900)
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ success: false, message: "Order failed. Please check Razorpay keys." });
    }
});

// ==========================================
// 2. PAYMENT VERIFY KARNA & NAYI E-BOOK DENA
// ==========================================
app.post('/api/verify-payment', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            console.log("Payment Verified! Sending School Growth E-Book...");
            
            // Nayi Book ka Path
            const filePath = path.join(__dirname, 'secret_files', '145_Tarike_School_Badhane_Ke_Inkdrip.pdf');

            if (fs.existsSync(filePath)) {
                // Browser ko batana ki ye file download karni hai (Browser me open nahi karni)
                res.setHeader('Content-Disposition', 'attachment; filename="145_Tarike_School_Badhane_Ke_Inkdrip.pdf"');
                res.setHeader('Content-Type', 'application/pdf');
                res.download(filePath, '145_Tarike_School_Badhane_Ke_Inkdrip.pdf');
            } else {
                console.error("File missing on server!");
                res.status(404).json({ success: false, message: "E-book file server par nahi mili! Admin se sampark karein." });
            }
        } else {
            res.status(400).json({ success: false, message: "Fake payment detected!" });
        }
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ success: false, message: "Server error during verification." });
    }
});

// Ye check karega ki agar local PC par hai toh server start karo
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

// Vercel ke liye app export
module.exports = app;