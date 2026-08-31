const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const authController = require('../controllers/auth.controller')

router.post("/sign-up", authController.signUp );

router.post("/sign-in",  authController.signIn);

router.get("/me", verifyToken, authController.verifyUser);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
