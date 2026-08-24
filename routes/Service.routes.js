const express = require("express");

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../controllers/service.controller");

const router = express.Router();

router.get("/", getServices);

router.get("/:id", getServiceById);

router.post("/", createService);

router.put("/:id", updateService);

router.delete("/:id", deleteService);

module.exports = router;
