const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");
const { verifyToken } = require("../middlewares/TokenVerification");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/logout", userController.logOutUser);
router.get("/me", verifyToken, userController.getMe);
router.post("/forgot-password", userController.forgotPassword);
router.get("/verify-reset-token/:token", userController.verifyResetToken);
router.post("/reset-password/:token", userController.resetPassword);
router.put("/update/:userId", verifyToken, userController.updateUserProfile);
router.post("/addAssignee", verifyToken, userController.addAssigneeByEmail);
router.get("/assignees", verifyToken, userController.getAllAssignees);
router.get("/allUsers", verifyToken, userController.getAllUsers);

module.exports = router;
