const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./stockmaster.db');
db.run('ALTER TABLE staff ADD COLUMN image_url TEXT', (err) => {
  if (err) console.log(err.message);
  else console.log('Column added');
});
