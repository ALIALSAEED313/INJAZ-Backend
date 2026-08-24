const express = require("express");

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();

router.get("/", getServices);

router.get("/:id", getServiceById);

router.post("/", createService);

router.put("/:id", updateService);

module.exports = router;
