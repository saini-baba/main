const express = require("express");
const router = express.Router();
const user_controler = require("../controller/user.controller");

router.post("/register", user_controler.reg);
router.post("/login", user_controler.login);
router.post("/data", user_controler.auth, user_controler.data);
router.delete("/delete", user_controler.auth, user_controler.softDeleteUser);
router.post("/sort", user_controler.auth, user_controler.sortUsers);
router.patch("/update", user_controler.auth, user_controler.update);

module.exports = router;
