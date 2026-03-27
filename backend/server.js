const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const path = require('path');
// Port configuration
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static frontend files from the parent directory
app.use(express.static(path.join(__dirname, '../')));
 
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
  const { sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, pieces_per_packet, description, image_url } = req.body;
  
  if (!sku || !name || !category_id || !supplier_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const p_per_packet = pieces_per_packet ? parseInt(pieces_per_packet) : 1;

  db.query(
    'INSERT INTO products (sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, pieces_per_packet, description, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sku, name, category_id, supplier_id, cost_price, sell_price, stock_quantity, p_per_packet, description, image_url, 'active'],
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
  const { name, category_id, supplier_id, cost_price, sell_price, stock_quantity, pieces_per_packet, description, image_url } = req.body;
  
  const p_per_packet = pieces_per_packet ? parseInt(pieces_per_packet) : 1;

  db.query(
    'UPDATE products SET name = ?, category_id = ?, supplier_id = ?, cost_price = ?, sell_price = ?, stock_quantity = ?, pieces_per_packet = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, category_id, supplier_id, cost_price, sell_price, stock_quantity, p_per_packet, description, image_url, req.params.id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Product not found' });
      } else {
        logActivity('PRODUCT', `Product updated: ${name}`);
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
      logActivity('PRODUCT', `Product ID ${req.params.id} marked as inactive`);
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
        logActivity('CATEGORY', `Category updated: ${name}`);
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
      logActivity('CATEGORY', `Category ID ${req.params.id} permanently deleted`);
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
        logActivity('SUPPLIER', `Supplier details updated: ${name}`);
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
      logActivity('SUPPLIER', `Supplier ID ${req.params.id} permanently deleted`);
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
        logActivity('STAFF', `Staff details updated: ${name} (${position})`);
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
      logActivity('STAFF', `Staff ID ${req.params.id} marked as inactive`);
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

  const order_id = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
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

// GET recent sales containing a specific product by SKU
app.get('/api/sales/by-sku/:sku', (req, res) => {
  const { sku } = req.params;
  db.query(`
    SELECT DISTINCT s.order_id, MAX(s.sale_date) as sale_date, p.name as product_name 
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE p.sku = ? AND s.quantity > 0
    GROUP BY s.order_id, p.name
    ORDER BY sale_date DESC LIMIT 10
  `, [sku], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET order details by Order ID
app.get('/api/sales/order/:order_id', (req, res) => {
  const { order_id } = req.params;
  db.query(`
    SELECT s.product_id, s.quantity, s.unit_price, s.total_amount, s.sale_date, 
           p.name as product_name, p.image_url, p.sku, p.pieces_per_packet,
           st.name as staff_name
    FROM sales s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.order_id = ? AND s.quantity > 0
  `, [order_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET currently online users (Publicly accessible for the sidebar)
app.get('/api/users/active', (req, res) => {
  db.query(`
    SELECT username, profile_image, role,
           (is_online = 1 AND datetime(last_seen, '+3 minutes') >= datetime('now')) as calculated_online
    FROM users 
    WHERE calculated_online = 1
    ORDER BY username
  `, (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      res.json(rows);
    }
  });
});

// POST process return
app.post('/api/returns', (req, res) => {
  const { original_order_id, staff_id, items } = req.body;
  
  if (!original_order_id || !items) {
    return res.status(400).json({ error: 'Missing required fields for return' });
  }

  const validItems = items.filter(i => i.return_quantity > 0);
  if (validItems.length === 0) {
    return res.status(400).json({ error: 'No items to return' });
  }

  const return_order_id = 'RET-' + original_order_id;

  // Fetch the original sale date to ensure returns are synced in the dashboard chart
  db.query('SELECT sale_date FROM sales WHERE order_id = ? LIMIT 1', [original_order_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Fallback to null if order not found, database default will be CURRENT_TIMESTAMP
    const original_sale_date = rows.length > 0 ? rows[0].sale_date : null;

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ error: err.message });

      let errorCount = 0;
      let completedCount = 0;
      const totalOperations = validItems.length * 2;

      const checkCompletion = () => {
        completedCount++;
        if (completedCount === totalOperations) {
          if (errorCount > 0) {
            db.rollback(() => {
              res.status(500).json({ error: 'Failed to process return' });
            });
          } else {
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: err.message });
                });
              }
              const totalItemsReturned = validItems.reduce((sum, item) => sum + item.return_quantity, 0);
              const totalRefundAmount = validItems.reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0);
              logActivity('SALE', `Processed return: ${totalItemsReturned} items refunded for GH₵${totalRefundAmount.toFixed(2)} (Ref: ${return_order_id})`);
              res.json({ message: 'Return processed successfully', return_order_id });
            });
          }
        }
      };

      validItems.forEach(item => {
        const refundAmount = item.return_quantity * item.unit_price;
        const insertQuery = original_sale_date 
          ? 'INSERT INTO sales (order_id, product_id, quantity, unit_price, total_amount, staff_id, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
          : 'INSERT INTO sales (order_id, product_id, quantity, unit_price, total_amount, staff_id) VALUES (?, ?, ?, ?, ?, ?)';
        
        const insertParams = original_sale_date 
          ? [return_order_id, item.product_id, -item.return_quantity, item.unit_price, -refundAmount, staff_id, original_sale_date]
          : [return_order_id, item.product_id, -item.return_quantity, item.unit_price, -refundAmount, staff_id];

        db.query(insertQuery, insertParams, (err) => {
          if (err) {
            console.error('Insert return sale error:', err);
            errorCount++;
          }
          checkCompletion();
        });
        
        db.query(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.return_quantity, item.product_id],
          (err) => {
            if (err) {
              console.error('Update stock error on return:', err);
              errorCount++;
            }
            checkCompletion();
          }
        );
      });
    });
  });
});

// ==================== DASHBOARD ENDPOINTS ====================

// Auth Endpoints
app.post('/api/login', (req, res) => {
  const { username, password, selectedRole, staffId } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = rows[0];

    // Verify hashed password
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify chosen role matches DB role
    if (selectedRole && user.role !== selectedRole) {
      return res.status(401).json({ error: `User is not a/an ${selectedRole}` });
    }

    if (selectedRole === 'staff' && staffId) {
      db.query('SELECT name, position, image_url FROM staff WHERE id = ?', [staffId], (sErr, sRows) => {
        let staffProfile = null;
        if (!sErr && sRows.length > 0) {
          staffProfile = sRows[0];
          logActivity('STAFF', `${staffProfile.name} (${staffProfile.position}) logged in to the system`);
        } else {
          logActivity('STAFF', `${user.username} (${user.role}) logged in to the system`);
        }

        // Set user as online
        db.query('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const responseUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          profile_image: user.profile_image || '',
          staff_id: staffId,
          staff_name: staffProfile ? staffProfile.name : user.username,
          staff_position: staffProfile ? staffProfile.position : 'Staff',
          staff_image: (staffProfile && staffProfile.image_url) ? staffProfile.image_url : ''
        };

        res.json({
          success: true,
          user: responseUser
        });
      });
    } else {
      logActivity('STAFF', `${user.username} (${user.role}) logged in to the system`);
      // Set user as online
      db.query('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          profile_image: user.profile_image
        }
      });
    }
  });
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
  const { userId } = req.body;
  if (userId) {
    db.query('UPDATE users SET is_online = 0 WHERE id = ?', [userId], (err) => {
      if (err) console.error('Logout status update error:', err);
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

// Heartbeat Endpoint
app.post('/api/users/heartbeat', (req, res) => {
  const { userId } = req.body;
  if (userId) {
    db.query('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [userId], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  } else {
    res.status(400).json({ error: 'User ID required' });
  }
});

// Notifications/Activity Logging Endpoint
app.post('/api/notifications', (req, res) => {
  const { type, description } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: 'Type and description are required' });
  }
  logActivity(type, description);
  res.json({ success: true });
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

// GET all users (Admin only)
app.get('/api/users', (req, res) => {
  // Return is_online based on either the explicit flag OR a last_seen within 3 minutes
  db.query(`
    SELECT id, username, role, profile_image, created_at, 
           (is_online = 1 AND datetime(last_seen, '+3 minutes') >= datetime('now')) as calculated_online
    FROM users 
    ORDER BY username
  `, (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      // Map the calculated field to is_online for the frontend
      const users = rows.map(u => ({
        ...u,
        is_online: !!u.calculated_online
      }));
      res.json(users);
    }
  });
});

// POST create new user
app.post('/api/users', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, role],
    (err, results) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Username already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        logActivity('STAFF', `New user account created: ${username} (${role})`);
        res.json({ id: results.insertId, message: 'User created successfully' });
      }
    }
  );
});

// PUT update user
app.put('/api/users/:id', (req, res) => {
  const { username, password, role } = req.body;
  
  if (password) {
    // Update both username/role AND password
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.query(
      'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
      [username, hashedPassword, role, req.params.id],
      (err, results) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'User updated successfully (including password)' });
      }
    );
  } else {
    // Update only username and role
    db.query(
      'UPDATE users SET username = ?, role = ? WHERE id = ?',
      [username, role, req.params.id],
      (err, results) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'User updated successfully' });
      }
    );
  }
});

// DELETE user
app.delete('/api/users/:id', (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ message: 'User deleted successfully' });
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
    }),
    // Profit Calculation (Today)
    new Promise((resolve, reject) => {
      db.query(`
        SELECT SUM((s.unit_price - p.cost_price) * s.quantity) as profit 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE DATE(s.sale_date) = DATE('now')
      `, (err, rows) => {
        err ? reject(err) : resolve(rows[0].profit || 0);
      });
    }),
    // Profit Calculation (Yesterday)
    new Promise((resolve, reject) => {
      db.query(`
        SELECT SUM((s.unit_price - p.cost_price) * s.quantity) as profit 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE DATE(s.sale_date) = DATE('now', '-1 day')
      `, (err, rows) => {
        err ? reject(err) : resolve(rows[0].profit || 0);
      });
    }),
    // Profit Calculation (Total)
    new Promise((resolve, reject) => {
      db.query(`
        SELECT SUM((s.unit_price - p.cost_price) * s.quantity) as profit 
        FROM sales s 
        JOIN products p ON s.product_id = p.id
      `, (err, rows) => {
        err ? reject(err) : resolve(rows[0].profit || 0);
      });
    })
  ])
  .then(([totalProducts, totalCategories, totalSuppliers, todaysSales, yesterdaysSales, hourlyToday, hourlyYesterday, todaysProfit, yesterdaysProfit, totalProfit]) => {
    res.json({
      totalProducts,
      totalCategories,
      totalSuppliers,
      todaysSales: parseFloat(todaysSales).toFixed(2),
      yesterdaysSales: parseFloat(yesterdaysSales).toFixed(2),
      todaysProfit: parseFloat(todaysProfit).toFixed(2),
      yesterdaysProfit: parseFloat(yesterdaysProfit).toFixed(2),
      totalProfit: parseFloat(totalProfit).toFixed(2),
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

// DELETE single activity log
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

// DELETE all activity logs
app.delete('/api/activities', (req, res) => {
  db.query('DELETE FROM activities', [], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'All activities deleted successfully' });
    }
  });
});

// POST create notification (saves to activities table)
app.post('/api/notifications', (req, res) => {
  const { type, description } = req.body;
  
  if (!type || !description) {
    return res.status(400).json({ error: 'Missing type or description' });
  }

  db.query(
    'INSERT INTO activities (type, description) VALUES (?, ?)',
    [type, description],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: results.insertId, message: 'Notification created successfully' });
      }
    }
  );
});

// ==================== REPORTS ENDPOINTS ====================
app.get('/api/reports/sales', (req, res) => {
  const { startDate, endDate, category } = req.query;
  
  let query = `
    SELECT 
      s.id, s.order_id, s.quantity, s.unit_price, s.total_amount, s.sale_date,
      p.name as product_name, p.cost_price, c.name as category_name,
      staff.name as staff_name
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN staff ON s.staff_id = staff.id
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ` AND DATE(s.sale_date) >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND DATE(s.sale_date) <= ?`;
    params.push(endDate);
  }
  if (category && category !== 'all') {
    query += ` AND c.name = ?`;
    params.push(category);
  }

  query += ` ORDER BY s.sale_date DESC`;

  db.query(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

// Start server
// POST generic notification
app.post('/api/notifications', (req, res) => {
  const { type, description } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'Missing type or description' });
  
  logActivity(type, description);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Stockmaster API running on http://localhost:${PORT} (SQLite Mode)`);
  console.log(`📝 Make sure to run: node init-db.js once to setup tables.`);
});
