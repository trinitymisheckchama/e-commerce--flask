const express = require("express");

const router = express.Router();
const { checkout } = require("../controllers/orderController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const {
    listProducts,
    addProduct
} = require("../controllers/productController");

router.get("/", listProducts);
router.post("/checkout", auth, roleCheck("buyer"), checkout);

router.post(
    "/add",
    auth,
    roleCheck("seller"),
    addProduct
);

module.exports = router;