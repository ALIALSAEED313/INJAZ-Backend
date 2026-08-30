const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const { upload, uploadToImageKit } = require("../middleware/Upload");

const {
  getServices,
  getPopularSearches,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesByFreelancer,
  getMyServices,
} = require("../controllers/service.controller");

const router = express.Router();

router.get("/", getServices);

router.get("/my-services", verifyToken, getMyServices);
router.get("/popular-searches", getPopularSearches);

router.get("/:id", getServiceById);

router.post(
  "/",
  verifyToken,
  upload.array("images", 5),
  uploadToImageKit,
  createService,
);

router.put(
  "/:id",
  verifyToken,
  upload.array("images", 5),
  uploadToImageKit,
  updateService,
);

router.delete("/:id", verifyToken, deleteService);

router.get("/profile/:userId", getServicesByFreelancer);

module.exports = router;
