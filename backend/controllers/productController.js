const db = require("../config/db");

const listProducts = (req, res) => {
	const { search = "", category = "", sort = "newest" } = req.query;
	const conditions = [];
	const values = [];

	if (search.trim()) {
		conditions.push("(name LIKE ? OR description LIKE ? OR category LIKE ?)");
		const searchTerm = `%${search.trim()}%`;
		values.push(searchTerm, searchTerm, searchTerm);
	}

	if (category.trim()) {
		conditions.push("category = ?");
		values.push(category.trim());
	}

	const orderBy = {
		newest: "created_at DESC",
		price_asc: "price ASC",
		price_desc: "price DESC",
		name: "name ASC"
	}[sort] || "created_at DESC";
	const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

	db.query(
		`SELECT id, name, description, price, category, image_url, stock, created_at
		 FROM products
		 WHERE (seller_id IS NULL OR seller_id IN (SELECT id FROM users WHERE role = 'seller' AND status = 'active'))
		 ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
		 ORDER BY ${orderBy}`,
		values,
		(error, products) => {
			if (error) {
				return res.status(500).json({ message: "Could not load products" });
			}
			return res.json({ products });
		}
	);
};

const listMyProducts = (req, res) => {
	db.query(
		`SELECT id, name, description, price, category, image_url, stock, created_at
		 FROM products WHERE seller_id = ? ORDER BY created_at DESC`,
		[req.user.id],
		(error, products) => {
			if (error) {
				return res.status(500).json({ message: "Could not load your listings" });
			}
			return res.json({ products });
		}
	);
};

const getMyPerformance = (req, res) => {
	const summarySql = `
		SELECT
			(SELECT COUNT(*) FROM products WHERE seller_id = ?) AS listings,
			(SELECT COALESCE(SUM(stock), 0) FROM products WHERE seller_id = ?) AS inventory,
			COUNT(DISTINCT CASE WHEN orders.status <> 'cancelled' THEN orders.id END) AS orders,
			COALESCE(SUM(CASE WHEN orders.status <> 'cancelled' THEN order_items.quantity ELSE 0 END), 0) AS unitsSold,
			COALESCE(SUM(CASE WHEN orders.status <> 'cancelled' THEN order_items.unit_price * order_items.quantity ELSE 0 END), 0) AS grossSales
		FROM products
		LEFT JOIN order_items ON order_items.product_id = products.id
		LEFT JOIN orders ON orders.id = order_items.order_id
		WHERE products.seller_id = ?
	`;
	db.query(summarySql, [req.user.id, req.user.id, req.user.id], (summaryError, summaryRows) => {
		if (summaryError) return res.status(500).json({ message: "Could not load seller performance" });
		db.query(
			`SELECT
				DATE_FORMAT(orders.created_at, '%Y-%m') AS month,
				COALESCE(SUM(order_items.unit_price * order_items.quantity), 0) AS grossSales,
				COALESCE(SUM(order_items.quantity), 0) AS unitsSold
			 FROM products
			 INNER JOIN order_items ON order_items.product_id = products.id
			 INNER JOIN orders ON orders.id = order_items.order_id AND orders.status <> 'cancelled'
			 WHERE products.seller_id = ?
				AND orders.created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
			 GROUP BY DATE_FORMAT(orders.created_at, '%Y-%m')
			 ORDER BY month`,
			[req.user.id],
			(monthlyError, monthlySales) => {
				if (monthlyError) return res.status(500).json({ message: "Could not load seller performance" });
				return res.json({ summary: summaryRows[0], monthlySales });
			}
		);
	});
};

const addProduct = (req, res) => {
	const { name, description = "", price, category, image_url = "", stock = 0 } = req.body;
	const parsedPrice = Number(price);
	const parsedStock = Number(stock);

	if (!name?.trim() || !category?.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 ||
		!Number.isInteger(parsedStock) || parsedStock < 0) {
		return res.status(400).json({ message: "Enter a name, category, valid price, and stock quantity" });
	}

	if (image_url && !/^https?:\/\//i.test(image_url)) {
		return res.status(400).json({ message: "Product image must use an http or https URL" });
	}

	db.query(
		`INSERT INTO products (seller_id, name, description, price, category, image_url, stock)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[req.user.id, name.trim(), description.trim(), parsedPrice, category.trim(), image_url.trim(), parsedStock],
		(error, result) => {
			if (error) {
				return res.status(500).json({ message: "Could not add product" });
			}
			return res.status(201).json({ message: "Product added", id: result.insertId });
		}
	);
};

module.exports = { listProducts, listMyProducts, getMyPerformance, addProduct };
