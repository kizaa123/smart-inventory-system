const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
 
// Activity Logging Helper
function logActivity(type, description) {
  db.query('INSERT INTO activities (type, description) VALUES (?, ?)', [type, description], (err) => {
    if (err) console.error('Activity log error:', err);
  });
}

// ==================== PRODUCTS ENDPOINTS ====================

// GET all products with category and supplier info
app.get('/api/products', (req, res) => {
  db.query(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.status = 'active'
    ORDER BY p.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET single product by ID
app.get('/api/products/:id', (req, res) => {
  db.query(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ? AND p.status = 'active'
  `, [req.params.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(rows[0]);
    }
  });
});

// GET product by SKU
app.get('/api/products/sku/:sku', (req, res) => {
  db.query(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.sku = ? AND p.status = 'active'
  `, [req.params.sku], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(rows[0]);
    }
  });
});

// POST create new product
app.post('/api/products', (req, res) => {
  const { sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, description, image_url } = req.body;
  
  if (!sku || !name || !category_id || !supplier_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.query(
    'INSERT INTO products (sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, description, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, description, image_url, 'active'],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        logActivity('PRODUCT', `New product added: ${name} (${sku})`);
        res.json({ id: results.insertId, message: 'Product created successfully' });
      }
    }
  );
});

// PUT update product
app.put('/api/products/:id', (req, res) => {
  const { name, category_id, supplier_id, cost_price, sell_price, stock_quantity, description, image_url } = req.body;
  
  db.query(
    'UPDATE products SET name = ?, category_id = ?, supplier_id = ?, cost_price = ?, sell_price = ?, stock_quantity = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, category_id, supplier_id, cost_price, sell_price, stock_quantity, description, image_url, req.params.id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Product not found' });
      } else {
        res.json({ message: 'Product updated successfully' });
      }
    }
  );
});

// DELETE product (Soft delete)
app.delete('/api/products/:id', (req, res) => {
  db.query('UPDATE products SET status = "inactive" WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json({ message: 'Product deleted successfully' });
    }
  });
});

// ==================== CATEGORIES ENDPOINTS ====================

// GET all categories
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST create category
app.post('/api/categories', (req, res) => {
  const { name, description, icon } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  db.query(
    'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)',
    [name, description, icon],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        logActivity('CATEGORY', `New category created: ${name}`);
        res.json({ id: results.insertId, message: 'Category created successfully' });
      }
    }
  );
});

// PUT update category
app.put('/api/categories/:id', (req, res) => {
  const { name, description, icon } = req.body;
  
  db.query(
    'UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ?',
    [name, description, icon, req.params.id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Category not found' });
      } else {
        res.json({ message: 'Category updated successfully' });
      }
    }
  );
});

// DELETE category
app.delete('/api/categories/:id', (req, res) => {
  db.query('DELETE FROM categories WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Category not found' });
    } else {
      res.json({ message: 'Category deleted successfully' });
    }
  });
});

// ==================== SUPPLIERS ENDPOINTS ====================

// GET all suppliers
app.get('/api/suppliers', (req, res) => {
  db.query('SELECT * FROM suppliers ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST create supplier
app.post('/api/suppliers', (req, res) => {
  const { name, contact_person, email, phone, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  db.query(
    'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
    [name, contact_person, email, phone, address],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        logActivity('SUPPLIER', `New supplier added: ${name}`);
        res.json({ id: results.insertId, message: 'Supplier created successfully' });
      }
    }
  );
});

// PUT update supplier
app.put('/api/suppliers/:id', (req, res) => {
  const { name, contact_person, email, phone, address } = req.body;
  
  db.query(
    'UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?',
    [name, contact_person, email, phone, address, req.params.id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Supplier not found' });
      } else {
        res.json({ message: 'Supplier updated successfully' });
      }
    }
  );
});

// DELETE supplier
app.delete('/api/suppliers/:id', (req, res) => {
  db.query('DELETE FROM suppliers WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Supplier not found' });
    } else {
      res.json({ message: 'Supplier deleted successfully' });
    }
  });
});

// ==================== STAFF ENDPOINTS ====================

// GET all staff
app.get('/api/staff', (req, res) => {
  db.query('SELECT * FROM staff WHERE status = "active" ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST create staff member
app.post('/api/staff', (req, res) => {
  const { name, email, phone, position, department, image_url } = req.body;
  
  if (!name || !email || !position) {
    return res.status(400).json({ error: 'Name, email, and position are required' });
  }

  db.query(
    'INSERT INTO staff (name, email, phone, position, department, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, position, department, image_url, 'active'],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        logActivity('STAFF', `New staff member added: ${name} (${position})`);
        res.json({ id: results.insertId, message: 'Staff member created successfully' });
      }
    }
  );
});

// PUT update staff
app.put('/api/staff/:id', (req, res) => {
  const { name, email, phone, position, department, image_url, status } = req.body;
  
  db.query(
    'UPDATE staff SET name = ?, email = ?, phone = ?, position = ?, department = ?, image_url = ?, status = ? WHERE id = ?',
    [name, email, phone, position, department, image_url, status, req.params.id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Staff member not found' });
      } else {
        res.json({ message: 'Staff member updated successfully' });
      }
    }
  );
});

// DELETE staff
app.delete('/api/staff/:id', (req, res) => {
  db.query('UPDATE staff SET status = "inactive" WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Staff member not found' });
    } else {
      res.json({ message: 'Staff member deleted successfully' });
    }
  });
});

// ==================== SALES ENDPOINTS ====================

// POST create sale (Checkout)
app.post('/api/sales', (req, res) => {
  const { items, staff_id } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const order_id = 'ORD-' + Date.now();
  
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    let errorCount = 0;
    let completedCount = 0;
    const totalOperations = items.length * 2;

    const checkCompletion = () => {
      completedCount++;
      if (completedCount === totalOperations) {
        if (errorCount > 0) {
          db.rollback(() => {
            res.status(500).json({ error: 'Failed to process sale' });
          });
        } else {
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }
            const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            logActivity('SALE', `Completed checkout: ${totalItems} items for GH₵${totalAmount.toFixed(2)} (Order #${order_id})`);
            res.json({ message: 'Sale completed successfully', order_id });
          });
        }
      }
    };

    items.forEach(item => {
      const totalAmount = item.quantity * item.price;
      db.query(
        'INSERT INTO sales (order_id, product_id, quantity, unit_price, total_amount, staff_id) VALUES (?, ?, ?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, item.price, totalAmount, staff_id],
        (err) => {
          if (err) {
            console.error('Insert sale error:', err);
            errorCount++;
          }
          checkCompletion();
        }
      );
      
      db.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id],
        (err) => {
          if (err) {
            console.error('Update stock error:', err);
            errorCount++;
          }
          checkCompletion();
        }
      );
    });
  });
});

// ==================== DASHBOARD ENDPOINTS ====================

// Auth Endpoints
app.post('/api/login', (req, res) => {
  const { username, password, selectedRole } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = rows[0];

    // Verify chosen role matches DB role
    if (selectedRole && user.role !== selectedRole) {
      return res.status(401).json({ error: `User is not a/an ${selectedRole}` });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  });
});

app.post('/api/users/profile-image', (req, res) => {
  const { userId, image } = req.body;
  if (!userId || !image) {
    return res.status(400).json({ error: 'User ID and image data required' });
  }

  db.run('UPDATE users SET profile_image = ? WHERE id = ?', [image, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
  Promise.all([
    new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) as count FROM products', (err, rows) => {
        err ? reject(err) : resolve(rows[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) as count FROM categories', (err, rows) => {
        err ? reject(err) : resolve(rows[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) as count FROM suppliers', (err, rows) => {
        err ? reject(err) : resolve(rows[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      db.query("SELECT SUM(total_amount) as total FROM sales WHERE DATE(sale_date) = DATE('now')", (err, rows) => {
        err ? reject(err) : resolve(rows[0].total || 0);
      });
    }),
    new Promise((resolve, reject) => {
      db.query("SELECT SUM(total_amount) as total FROM sales WHERE DATE(sale_date) = DATE('now', '-1 day')", (err, rows) => {
        err ? reject(err) : resolve(rows[0].total || 0);
      });
    }),
    // Hourly sales mapping (Today)
    new Promise((resolve, reject) => {
      db.query("SELECT STRFTIME('%H', sale_date) as hour, SUM(total_amount) as total FROM sales WHERE DATE(sale_date) = DATE('now') GROUP BY hour", (err, rows) => {
        err ? reject(err) : resolve(rows);
      });
    }),
    // Hourly sales mapping (Yesterday)
    new Promise((resolve, reject) => {
      db.query("SELECT STRFTIME('%H', sale_date) as hour, SUM(total_amount) as total FROM sales WHERE DATE(sale_date) = DATE('now', '-1 day') GROUP BY hour", (err, rows) => {
        err ? reject(err) : resolve(rows);
      });
    })
  ])
  .then(([totalProducts, totalCategories, totalSuppliers, todaysSales, yesterdaysSales, hourlyToday, hourlyYesterday]) => {
    res.json({
      totalProducts,
      totalCategories,
      totalSuppliers,
      todaysSales: parseFloat(todaysSales).toFixed(2),
      yesterdaysSales: parseFloat(yesterdaysSales).toFixed(2),
      hourlyToday: hourlyToday.map(r => ({ ...r, hour: parseInt(r.hour) })),
      hourlyYesterday: hourlyYesterday.map(r => ({ ...r, hour: parseInt(r.hour) }))
    });
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// GET recent activities (Replacing recent-sales)
app.get('/api/dashboard/recent-sales', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  let sql = 'SELECT * FROM activities ORDER BY created_at DESC';
  if (limit) {
    sql += ' LIMIT ' + limit;
  }
  
  db.query(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// DELETE activity log
app.delete('/api/activities/:id', (req, res) => {
  db.query('DELETE FROM activities WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Activity not found' });
    } else {
      res.json({ message: 'Activity deleted successfully' });
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Stockmaster API running on http://localhost:${PORT} (SQLite Mode)`);
  console.log(`📝 Make sure to run: node init-db.js once to setup tables.`);
});
