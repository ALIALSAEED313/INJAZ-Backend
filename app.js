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


module.exports = app