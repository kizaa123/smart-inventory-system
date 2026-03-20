const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'stockmaster.db');
const db = new sqlite3.Database(dbPath);

console.log('====================================');
console.log('   STOCKMASTER DATABASE RESET');
console.log('====================================');
console.log('Wiping operational records ONLY...');
console.log('Protecting: users, passwords, roles.');

db.serialize(() => {
  // 1. Temporarily disable foreign keys for a clean sweep
  db.run('PRAGMA foreign_keys = OFF;');

  // 2. Clear all operational tables
  const tables = ['sales', 'products', 'categories', 'suppliers', 'activities', 'staff'];
  
  // 3. Clear profile images from users (Admin/Staff photos)
  db.run('UPDATE users SET profile_image = NULL', (err) => {
    if (err) console.error('❌ Error clearing user profile images:', err.message);
    else console.log('✅ Cleared all User profile pictures');
  });

  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`❌ Error clearing ${table}:`, err.message);
      } else {
        console.log(`✅ Cleared table: ${table}`);
      }
    });

    // 3. Reset the primary key counters back to 1
    db.run(`DELETE FROM sqlite_sequence WHERE name = '${table}'`, (err) => {
        if (err && !err.message.includes('no such table')) {
             // Silently ignore if table wasn't in sequence list
        }
    });
  });

  // 4. Re-enable foreign keys and finish
  db.run('PRAGMA foreign_keys = ON;', () => {
     console.log('====================================');
     console.log('DATABASE RESET COMPLETE!');
     console.log('Your Inventory is now empty and fresh.');
     console.log('Existing Admin/Staff logins are still active.');
     console.log('====================================');
     process.exit(0);
  });
});
