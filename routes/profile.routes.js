const express = require("express")
const router = express.Router()

const profileController = require("../controllers/profile.controller")
const verifyToken = require("../middleware/verifyToken")

router.get("/me", verifyToken, profileController.getMyProfile)
router.get("/:userId", profileController.getProfile)
router.put("/", verifyToken, profileController.updateProfile)
router.delete("/", verifyToken, profileController.deleteProfile)

module.exports = router