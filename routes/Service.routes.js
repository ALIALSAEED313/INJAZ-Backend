const express = require("express");
const verifyToken = require("../middleware/verifyToken")

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

router.post("/", verifyToken, createService);

router.put("/:id", verifyToken, updateService);

router.delete("/:id", verifyToken, deleteService);

module.exports = router;
