const mysql = require('mysql2');

// MySQL Configuration for XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stockmaster',
  multipleStatements: true // Essential for running multiple queries in one go
});

const schema = `
-- Drop tables if they exist (Reverse order of dependencies)
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS categories;

-- Create Categories Table
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Suppliers Table
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Products Table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  supplier_id INT NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  sell_price DECIMAL(10, 2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Create Staff Table
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Activities Table
CREATE TABLE activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Sales Table
CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  staff_id INT,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);
`;

connection.connect(async (err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('🚀 Connected to MySQL. Resetting schema...');

  connection.query(schema, (err) => {
    if (err) {
      console.error('❌ Error creating tables:', err.message);
      connection.end();
      process.exit(1);
    }
    console.log('✅ Tables created successfully.');

    // Insert Sample Categories
    const categories = [
      ['Accessories', 'fa-laptop'],
      ['Wireless Device', 'fa-wifi'],
      ['Smart Phone', 'fa-mobile-screen-button'],
      ['Audio', 'fa-headphones'],
      ['Smart Home Hub', 'fa-camera'],
      ['Gamming Device', 'fa-gamepad'],
      ['Vitual Device', 'fa-glasses']
    ];
    connection.query('INSERT IGNORE INTO categories (name, icon) VALUES ?', [categories]);

    // Insert Sample Suppliers
    const suppliers = [
      ['BestBuy Gadget', 'John Smith', 'contact@bestbuy.com', '+1-800-555-1234', '123 Tech Lane'],
      ['Newegg Tech.', 'Jane Doe', 'sales@newegg.com', '+1-888-555-5678', '456 Silicon Valley'],
      ['B&H Photo Tech.', 'Bob King', 'support@bhphoto.com', '+1-212-555-9999', '789 Media Square'],
      ['Adorama Gadget', 'Alice Ray', 'info@adorama.com', '+1-888-555-0000', '101 Optic Street'],
      ['Micro-Center', 'Charlie Box', 'contact@microcenter.com', '+1-614-555-1111', '202 CPU Drive']
    ];
    connection.query('INSERT IGNORE INTO suppliers (name, contact_person, email, phone, address) VALUES ?', [suppliers]);

    // Insert Sample Products
    const products = [
      ['#AT-9501', 'Apple TV 4k', 5, 1, 900.00, 1450.00, 20, 5, 'https://placehold.co/400x400?text=Apple+TV'],
      ['#AC-2301', 'Mackbook 2020', 1, 2, 300.00, 500.00, 5, 2, 'https://placehold.co/400x400?text=Macbook'],
      ['#SW-9901', 'Apple Series 10', 2, 3, 150.00, 300.00, 15, 3, 'https://placehold.co/400x400?text=Apple+Watch'],
      ['#IP-9901', 'Iphone 15pro max', 3, 4, 100.00, 200.00, 20, 5, 'https://placehold.co/400x400?text=iPhone'],
      ['#SP-9901', 'Home Pod-Mini', 4, 1, 50.00, 100.00, 10, 2, 'https://placehold.co/400x400?text=Homepod'],
      ['#IV-1101', 'CCTV Camera', 5, 5, 50.00, 100.00, 25, 5, 'https://placehold.co/400x400?text=CCTV'],
      ['#WR-2901', '4G Router', 2, 2, 100.00, 200.00, 3, 5, 'https://placehold.co/400x400?text=Router'],
      ['#DL-5501', 'Dell XPS 13', 1, 3, 200.00, 400.00, 30, 10, 'https://placehold.co/400x400?text=DellXPS'],
      ['#SS-9301', 'Samsung S24 Ultra', 3, 4, 200.00, 400.00, 9, 3, 'https://placehold.co/400x400?text=S24Ultra'],
      ['#SP-1101', 'PJAA Speaker', 4, 5, 150.00, 300.00, 7, 2, 'https://placehold.co/400x400?text=Speaker']
    ];
    connection.query('INSERT IGNORE INTO products (sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, low_stock_threshold, image_url) VALUES ?', [products]);

    // Insert Sample Staff
    const staff = [
      ['System Admin', 'admin@stockmaster.com', '0240000000', 'Administrator', 'Management', 'https://i.pravatar.cc/150?u=admin'],
      ['John Doe', 'john@stockmaster.com', '0241111111', 'Manager', 'Sales', 'https://i.pravatar.cc/150?u=john'],
      ['Sarah Smith', 'sarah@stockmaster.com', '0242222222', 'Cashier', 'Sales', 'https://i.pravatar.cc/150?u=sarah']
    ];
    connection.query('INSERT IGNORE INTO staff (name, email, phone, position, department, image_url) VALUES ?', [staff]);

    // Insert Initial Activities
    const activities = [
      ['SYSTEM', 'Inventory Management System Migrated to MySQL'],
      ['PRODUCT', 'Initial stock of 10 products synchronized'],
      ['STAFF', 'Administrator and sales staff profiles verified']
    ];
    connection.query('INSERT INTO activities (type, description) VALUES ?', [activities]);

    console.log('✅ Sample data migrated successfully.');
    console.log('✨ MySQL Database Reset Complete!');
    connection.end();
  });
});
