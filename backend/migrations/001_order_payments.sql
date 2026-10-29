ALTER TABLE orders
    ADD COLUMN payment_method ENUM('cash_on_delivery') NOT NULL DEFAULT 'cash_on_delivery',
    ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending';