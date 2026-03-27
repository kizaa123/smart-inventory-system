const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'stockmaster.db'));

db.all('SELECT id, name, LENGTH(image_url) as len, substr(image_url, 1, 50) as prefix FROM staff', (err, rows) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
