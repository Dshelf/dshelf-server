const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");

const userController = require("../controllers/users.controller");

//for personal profiles
router.post("/forget-password-request", userController.ForgetPasswordRequest);
router.post("/forget-password-update", userController.ForgetPasswordUpdate); 

router.put("/updatePassword", requireAuth, userController.UpdatePassword);

router.get("/getProfile", requireAuth, userController.GetProfile);

router.put("/updateProfile", requireAuth, userController.updateProfile);

module.exports = router;
