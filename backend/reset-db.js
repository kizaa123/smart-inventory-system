const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const dbPath = path.join(__dirname, 'stockmaster.db');

console.log('🚀 Resetting database...');

if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Existing database deleted.');
  } catch (err) {
    console.error('❌ Error deleting database:', err);
    process.exit(1);
  }
}

console.log('🔨 Running init-db.js to recreate database...');

const init = spawn('node', ['init-db.js'], { stdio: 'inherit', cwd: __dirname });

init.on('close', (code) => {
  if (code === 0) {
    console.log('✨ Database reset and initialized successfully!');
  } else {
    console.error(`❌ init-db.js exited with code ${code}`);
  }
  process.exit(code);
});
