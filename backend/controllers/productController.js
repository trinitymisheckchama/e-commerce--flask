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
		 FROM products ${where} ORDER BY ${orderBy}`,
		values,
		(error, products) => {
			if (error) {
				return res.status(500).json({ message: "Could not load products" });
			}
			return res.json({ products });
		}
	);
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

module.exports = { listProducts, addProduct };
