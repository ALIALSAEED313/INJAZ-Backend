const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();


const app = require('./app')

app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed:", error);
  });