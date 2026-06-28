const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const {
    addProduct
} = require("../controllers/productController");

router.post(
    "/add",
    auth,
    roleCheck("seller"),
    addProduct
);

module.exports = router;