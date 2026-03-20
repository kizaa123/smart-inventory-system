const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'stockmaster.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create tables first
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      image_url TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      position TEXT NOT NULL,
      department TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
 
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      profile_image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Explicitly add profile_image column if it doesn't exist (handles existing databases)
  db.run("ALTER TABLE users ADD COLUMN profile_image TEXT", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        // Column already exists, this is fine
      } else {
        console.error('Error adding profile_image column:', err.message);
      }
    } else {
      console.log('✅ Added profile_image column to users table');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      staff_id INTEGER,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    )
  `);

  // Insert default users (hashed passwords)
  const adminHash = bcrypt.hashSync('StockMaster1122', 10);
  const staffHash = bcrypt.hashSync('StockUser1133', 10);

  db.run(
    "INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')",
    [adminHash],
    function(err) {
      if (err) console.error('Error inserting default admin:', err);
      else console.log('✅ Default admin user created (admin/StockMaster1122)');
    }
  );

  db.run(
    "INSERT OR IGNORE INTO users (username, password, role) VALUES ('staff', ?, 'staff')",
    [staffHash],
    function(err) {
      if (err) console.error('Error inserting default staff:', err);
      else console.log('✅ Default staff user created (staff/StockUser1133)');

      db.close(() => {
        console.log('✅ Database initialization complete — system starts empty.');
        process.exit(0);
      });
    }
  );
});
