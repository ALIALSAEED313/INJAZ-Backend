// imports
const express = require("express") //importing express package
const app = express() // creates a express application
const dotenv = require("dotenv").config() //this allows me to use my .env values in this file
const morgan = require('morgan')
const cors = require('cors')

// Routes Import
const authRoutes = require('./routes/auth.routes')
const orderRoutes = require('./routes/ordersRoutes')
const profileRoutes = require("./routes/profile.routes")
const serviceRoutes = require("./routes/Service.routes")
const chatRoutes = require("./routes/chatRoutes")
const reviewRoutes = require("./routes/review.routes")
const adminRoutes = require("./routes/admin.routes")
const notificationRoutes = require("./routes/notification.routes")
const sendEmail = require("./middleware/sendEmail")
const paymentRoutes = require('./routes/payment.routes')

// Middleware
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
    })
);
app.use(express.json())
app.use(morgan('dev'))



// Routes
app.use('/auth',authRoutes)
app.use('/orders', orderRoutes)
app.use('/profile', profileRoutes)
app.use("/services", serviceRoutes);
app.use("/chat", chatRoutes)
app.use("/reviews", reviewRoutes)
app.use("/admin", adminRoutes)
app.use("/notifications", notificationRoutes)
app.use('/payments', paymentRoutes)

app.get("/test-email", async (req, res) => {
  try {
    console.log("Email:", process.env.BREVO_LOGIN);
  console.log("Key:", process.env.BREVO_SMTP_KEY)
    await sendEmail({
      email: "alwani32020@gmail.com", // ⚠️ Change this to your actual email
      subject: "Test Email from Injaz Platform 🚀",
      message: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h1 style="color: #1ba84c;">Hello from Injaz!</h1>
          <p>If you are reading this, Brevo and Nodemailer are working perfectly.</p>
        </div>
      `
    });

    res.status(200).json({ message: "Test email sent successfully! Go check your inbox." });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
})

module.exports = app