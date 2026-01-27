const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../server/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log(JSON.stringify(db.product_members, null, 2));
