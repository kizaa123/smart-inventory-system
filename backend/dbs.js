const mysql = require('mysql2');

// MySQL Configuration for XAMPP
// Default XAMPP settings: host='localhost', user='root', password='', database='stockmaster'
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Default XAMPP password is empty
  database: 'stockmaster'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err.message);
    console.error('👉 Make sure XAMPP Control Panel has MySQL STARTED');
    console.error('👉 Make sure you created the "stockmaster" database in phpMyAdmin');
    return;
  }
  console.log('✅ Connected to MySQL database via XAMPP');
});

module.exports = connection.promise();
