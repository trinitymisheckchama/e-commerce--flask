const express = require("express");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const {
    createAccount,
    deleteAccount,
    getReports,
    listAccounts,
    updateAccountStatus
} = require("../controllers/adminController");

const router = express.Router();
router.use(auth, roleCheck("admin"));
router.get("/users", listAccounts);
router.post("/users", createAccount);
router.patch("/users/:id/status", updateAccountStatus);
router.delete("/users/:id", deleteAccount);
router.get("/reports", getReports);

module.exports = router;