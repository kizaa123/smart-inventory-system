const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./stockmaster.db');

db.serialize(() => {
    // Check if status column exists
    db.all("PRAGMA table_info(products)", (err, columns) => {
        if (err) {
            console.error(err.message);
            return;
        }
        
        const hasStatus = columns.some(col => col.name === 'status');
        if (!hasStatus) {
            db.run("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active'", (err) => {
                if (err) console.error('Error adding status column:', err.message);
                else console.log('Successfully added status column to products table');
                db.close();
            });
        } else {
            console.log('Status column already exists in products table');
            db.close();
        }
    });
});
