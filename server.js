const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const serviceRoutes = require("./routes/serviceRoutes");

const app = express();

app.use(express.json());

app.use("/services", serviceRoutes);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed:", error);
  });
