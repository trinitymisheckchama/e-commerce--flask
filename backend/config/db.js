const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let adminBootstrapStarted = false;

function bootstrapDevelopmentAdmin() {
    if (process.env.NODE_ENV !== "development" || adminBootstrapStarted) return;
    adminBootstrapStarted = true;

    pool.query(
        "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
        ["admin", "admin@localhost"],
        (lookupError, users) => {
            if (lookupError) {
                adminBootstrapStarted = false;
                console.error("Could not check bootstrap admin:", lookupError.message);
                return;
            }
            if (users.length) return;

            bcrypt.hash("Admin123", 10, (hashError, passwordHash) => {
                if (hashError) {
                    adminBootstrapStarted = false;
                    console.error("Could not prepare bootstrap admin:", hashError.message);
                    return;
                }

                pool.query(
                    "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')",
                    ["admin", "admin@localhost", passwordHash],
                    (insertError) => {
                        if (insertError) {
                            adminBootstrapStarted = insertError.code === "ER_DUP_ENTRY";
                            console.error("Could not create bootstrap admin:", insertError.message);
                            return;
                        }
                        console.log("Development admin account created");
                    }
                );
            });
        }
    );
}

pool.on("connection", bootstrapDevelopmentAdmin);
pool.getConnection((error, connection) => {
    if (error) {
        console.error("Database connection failed:", error.message);
        return;
    }
    console.log("MySQL connected");
    connection.release();
});

module.exports = pool;