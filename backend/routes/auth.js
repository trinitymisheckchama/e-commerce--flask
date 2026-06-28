const express = require("express");

const router = express.Router();

const {
    register,
    login
} = require("../controllers/authController");

console.log("Auth route file loaded");
console.log(register);
console.log(login);

router.post("/register", register);
router.post("/login", login);

module.exports = router;