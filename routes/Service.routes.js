const express = require("express");
const verifyToken = require("../middleware/verifyToken")

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesByFreelancer
  getMyServices,
} = require("../controllers/service.controller");

const router = express.Router();

router.get("/", getServices);

router.get("/my-services", verifyToken, getMyServices);

router.get("/:id", getServiceById);

router.post("/", verifyToken, createService);

router.put("/:id", verifyToken, updateService);

router.delete("/:id", verifyToken, deleteService);

router.get('/profile/:userId', getServicesByFreelancer)

module.exports = router;
