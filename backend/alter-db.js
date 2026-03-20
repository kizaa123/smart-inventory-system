const db = require('./database');

db.run("ALTER TABLE products ADD COLUMN pieces_per_packet INTEGER DEFAULT 1", (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ Column pieces_per_packet already exists in products table.');
    } else {
      console.error('❌ Error adding column:', err.message);
    }
  } else {
    console.log('✅ Added pieces_per_packet column to products table.');
  }
  process.exit(0);
});
