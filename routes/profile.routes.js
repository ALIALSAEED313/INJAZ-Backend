const express = require("express")
const router = express.Router()

const profileController = require("../controllers/profile.controller")
const verifyToken = require("../middleware/verifyToken")
const { upload, uploadToImageKit } = require('../middleware/Upload')

router.get("/me", verifyToken, profileController.getMyProfile)
router.get("/:userId", profileController.getProfile)
router.put("/", verifyToken, upload.single('avatar'), uploadToImageKit ,profileController.updateProfile)
router.delete("/", verifyToken, profileController.deleteProfile)

module.exports = router