const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/stockmaster.db');

db.all('SELECT id, name, image_url FROM staff', (err, rows) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
