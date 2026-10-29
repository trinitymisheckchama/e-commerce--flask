const express = require("express");

const router = express.Router();
const { checkout } = require("../controllers/orderController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const {
    listProducts,
    listMyProducts,
    getMyPerformance,
    addProduct
} = require("../controllers/productController");

router.get("/mine", auth, roleCheck("seller"), listMyProducts);
router.get("/mine/performance", auth, roleCheck("seller"), getMyPerformance);
router.get("/", listProducts);
router.post("/checkout", auth, roleCheck("buyer"), checkout);

router.post(
    "/add",
    auth,
    roleCheck("seller"),
    addProduct
);

module.exports = router;