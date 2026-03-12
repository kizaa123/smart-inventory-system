const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'stockmaster.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite Connection Error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database:', dbPath);
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
  }
});

// Polyfill for mysql-like .query() method to minimize server.js changes
db.query = function(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA');

  if (isSelect) {
    return this.all(sql, params, callback);
  } else {
    return this.run(sql, params, function(err) {
      if (callback) {
        // Return an object that looks like MySQL results (with insertId/affectedRows)
        callback.call(this, err, {
          insertId: this.lastID,
          affectedRows: this.changes
        });
      }
    });
  }
};

// Add transaction support (basic)
db.beginTransaction = (callback) => db.run('BEGIN TRANSACTION', callback);
db.commit = (callback) => db.run('COMMIT', callback);
db.rollback = (callback) => db.run('ROLLBACK', callback);

module.exports = db;
