const db = require("../config/db");

const query = (connection, sql, values = []) => new Promise((resolve, reject) => {
    connection.query(sql, values, (error, results) => {
        if (error) reject(error);
        else resolve(results);
    });
});

const checkout = async (req, res) => {
    const items = req.body.items;
    const paymentMethod = req.body.paymentMethod;
    if (paymentMethod !== "cash_on_delivery") {
        return res.status(400).json({ message: "Choose a supported payment method" });
    }
    if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
        !item || !Number.isInteger(Number(item.productId)) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1
    )) {
        return res.status(400).json({ message: "Add valid products and quantities to your cart" });
    }

    const quantities = new Map();
    items.forEach(({ productId, quantity }) => {
        const id = Number(productId);
        quantities.set(id, (quantities.get(id) || 0) + Number(quantity));
    });
    const productIds = [...quantities.keys()];

    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            return res.status(500).json({ message: "Could not start checkout" });
        }

        connection.beginTransaction((transactionError) => {
            if (transactionError) {
                connection.release();
                return res.status(500).json({ message: "Could not start checkout" });
            }

            const placeOrder = async () => {
                try {
                    const products = await query(
                        connection,
                        `SELECT id, name, price, stock FROM products WHERE id IN (${productIds.map(() => "?").join(",")}) FOR UPDATE`,
                        productIds
                    );
                    if (products.length !== productIds.length) {
                        throw Object.assign(new Error("One or more products are no longer available"), { status: 400 });
                    }

                    for (const product of products) {
                        if (product.stock < quantities.get(product.id)) {
                            throw Object.assign(new Error(`${product.name} does not have enough stock`), { status: 409 });
                        }
                    }

                    const total = products.reduce((sum, product) =>
                        sum + Number(product.price) * quantities.get(product.id), 0);
                    const order = await query(
                        connection,
                        "INSERT INTO orders (buyer_id, total, status, payment_method, payment_status) VALUES (?, ?, 'placed', ?, 'pending')",
                        [req.user.id, total.toFixed(2), paymentMethod]
                    );

                    for (const product of products) {
                        const quantity = quantities.get(product.id);
                        await query(
                            connection,
                            "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)",
                            [order.insertId, product.id, product.name, product.price, quantity]
                        );
                        await query(connection, "UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
                    }

                    connection.commit((commitError) => {
                        if (commitError) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ message: "Could not complete checkout" });
                            });
                        }
                        connection.release();
                        return res.status(201).json({
                            orderId: order.insertId,
                            total: total.toFixed(2),
                            paymentMethod,
                            paymentStatus: "pending"
                        });
                    });
                } catch (error) {
                    connection.rollback(() => {
                        connection.release();
                        res.status(error.status || 500).json({
                            message: error.status ? error.message : "Could not complete checkout"
                        });
                    });
                }
            };

            placeOrder();
        });
    });
};

module.exports = { checkout };