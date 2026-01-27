const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'server/db.json');

try {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // 1. Find the real user (first non-mock user)
  let realUser = null;
  
  // Look in product_members for a real user
  for (const pid in db.product_members) {
    const members = db.product_members[pid];
    const found = members.find(m => !m.id.startsWith('mock-') && m.role !== 'owner'); // Find a member who is NOT the mock owner
    if (found) {
      realUser = found;
      break;
    }
  }

  if (!realUser) {
    console.log('No real user found to promote to owner. Aborting.');
    process.exit(1);
  }

  console.log(`Promoting user to owner: ${realUser.full_name} (${realUser.id})`);

  // 2. Update products
  db.products.forEach(p => {
    if (p.owner_id === 'mock-user-1') {
      p.owner_id = realUser.id;
    }
  });

  // 3. Update product_members
  for (const pid in db.product_members) {
    const members = db.product_members[pid];
    
    // Check if real user is already in the list
    const realUserInListIndex = members.findIndex(m => m.id === realUser.id);
    const mockOwnerIndex = members.findIndex(m => m.id === 'mock-user-1');

    if (mockOwnerIndex !== -1) {
      // Remove mock owner
      members.splice(mockOwnerIndex, 1);
    }

    if (realUserInListIndex !== -1) {
      // Update existing real user to owner
      members[realUserInListIndex].role = 'owner';
    } else {
      // Add real user as owner if not present
      const newOwner = { ...realUser, role: 'owner', joined_at: new Date().toISOString(), last_active: new Date().toISOString() };
      members.unshift(newOwner);
    }
  }

  // 4. Save DB
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log('Database updated successfully.');

} catch (e) {
  console.error('Error:', e);
}
