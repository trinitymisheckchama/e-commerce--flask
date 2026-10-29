const bcrypt = require("bcrypt");
const db = require("../config/db");

const listAccounts = (req, res) => {
    db.query(
        "SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC",
        (error, users) => {
            if (error) return res.status(500).json({ message: "Could not load accounts" });
            return res.json({ users });
        }
    );
};

const createAccount = async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username?.trim() || !/^\S+@\S+\.\S+$/.test(email?.trim() || "") ||
        typeof password !== "string" || password.length < 8 || !["buyer", "seller"].includes(role)) {
        return res.status(400).json({ message: "Enter a name, valid email, password of at least 8 characters, and buyer or seller role" });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
            [username.trim(), email.trim().toLowerCase(), passwordHash, role],
            (error, result) => {
                if (error) {
                    const duplicate = error.code === "ER_DUP_ENTRY";
                    return res.status(duplicate ? 409 : 500).json({
                        message: duplicate ? "An account with that email already exists" : "Could not create account"
                    });
                }
                return res.status(201).json({
                    user: { id: result.insertId, username: username.trim(), email: email.trim().toLowerCase(), role, status: "active" }
                });
            }
        );
    } catch {
        return res.status(500).json({ message: "Could not create account" });
    }
};

const updateAccountStatus = (req, res) => {
    const accountId = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(accountId) || accountId < 1 || !["active", "disabled"].includes(status)) {
        return res.status(400).json({ message: "Choose a valid account and active or disabled status" });
    }
    db.query(
        "UPDATE users SET status = ? WHERE id = ? AND role <> 'admin' AND status <> 'deleted'",
        [status, accountId],
        (error, result) => {
            if (error) return res.status(500).json({ message: "Could not update account" });
            if (!result.affectedRows) return res.status(404).json({ message: "Account not found or cannot be changed" });
            return res.json({ message: `Account ${status}`, status });
        }
    );
};

const deleteAccount = (req, res) => {
    const accountId = Number(req.params.id);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
        return res.status(400).json({ message: "Choose a valid account" });
    }
    db.query(
        "UPDATE users SET status = 'deleted' WHERE id = ? AND role <> 'admin' AND status <> 'deleted'",
        [accountId],
        (error, result) => {
            if (error) return res.status(500).json({ message: "Could not delete account" });
            if (!result.affectedRows) return res.status(404).json({ message: "Account not found or cannot be deleted" });
            return res.json({ message: "Account deleted" });
        }
    );
};

const getReports = (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM users) AS totalAccounts,
            (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeAccounts,
            (SELECT COUNT(*) FROM users WHERE role = 'seller' AND status = 'active') AS activeSellers,
            (SELECT COUNT(*) FROM orders) AS totalOrders,
            (SELECT COALESCE(SUM(total), 0) FROM orders) AS orderValue,
            (SELECT COUNT(*) FROM products WHERE seller_id IS NOT NULL) AS sellerListings
    `;
    db.query(sql, (summaryError, summaryRows) => {
        if (summaryError) return res.status(500).json({ message: "Could not load reports" });
        db.query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS orderValue FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month",
            (ordersError, monthlyOrders) => {
                if (ordersError) return res.status(500).json({ message: "Could not load reports" });
                db.query(
                    "SELECT role, status, COUNT(*) AS count FROM users GROUP BY role, status",
                    (accountsError, accountsByRole) => {
                        if (accountsError) return res.status(500).json({ message: "Could not load reports" });
                        return res.json({ summary: summaryRows[0], monthlyOrders, accountsByRole });
                    }
                );
            }
        );
    });
};

module.exports = { createAccount, deleteAccount, getReports, listAccounts, updateAccountStatus };