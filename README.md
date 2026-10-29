# Good Goods

A small marketplace MVP built with Express, MySQL, and a vanilla HTML/CSS/JavaScript storefront. Shoppers can browse and search inventory, create an account, keep a local shopping bag, choose cash on delivery, and place orders. Sellers can create listings and view their own products. Orders reserve inventory transactionally; online card processing is not included.

## Requirements

- Node.js 18 or newer
- MySQL 8 or newer

## Run locally

1. Create a database and load the schema and sample products:

   ```sql
   CREATE DATABASE good_goods CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

   ```sh
   mysql -u root -p good_goods < backend/schema.sql
   ```

2. Configure `backend/.env` with the local database settings and a private JWT secret:

   ```env
   NODE_ENV=development
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=good_goods
   JWT_SECRET=replace_with_a_long_random_secret
   ```

For an existing database created before payment selection was added, apply the migration once:

```sh
mysql -u YOUR_DB_USER -p YOUR_DB_NAME < backend/migrations/001_order_payments.sql
```

3. Install dependencies and start the server:

   ```sh
   cd backend
   npm install
   npm start
   ```

4. Open [http://localhost:5000](http://localhost:5000).

With `NODE_ENV=development`, the server creates a one-time admin account after connecting to MySQL if its username and email are unused: username `admin`, password `Admin123`. Sign in with those credentials and choose **Admin dashboard** in the header. The bootstrap is disabled unless development mode is explicitly enabled; never deploy with the development credentials enabled.

The API is available at `/api/products` and `/api/auth`. Register as a shopper to place orders, or as a seller to add products and view seller-owned listings. Checkout currently supports cash on delivery; accepting card payments requires integrating a payment provider. Sample catalog images are served by Unsplash URLs; sellers can provide their own HTTPS image URL.

## API

- `GET /api/products?search=&category=&sort=` lists inventory.
- `POST /api/auth/register` creates a buyer or seller account.
- `POST /api/auth/login` returns a signed token.
- `POST /api/products/add` creates a product for an authenticated seller.
- `GET /api/products/mine` lists products for the authenticated seller.
- `POST /api/products/checkout` places an order for an authenticated buyer and decrements stock in a MySQL transaction.