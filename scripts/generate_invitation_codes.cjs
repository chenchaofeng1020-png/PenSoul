const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually load .env
try {
  const envPath = path.resolve(__dirname, '../.env');
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if any
      process.env[key] = value;
    }
  });
} catch (e) {
  console.log('Could not load .env file', e);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log('Generating 100 invitation codes...');
  
  const codes = [];
  const rows = [];
  
  for (let i = 0; i < 100; i++) {
    const code = generateCode();
    codes.push(code);
    rows.push({
      code,
      type: 'one_time',
      max_uses: 1,
      used_count: 0
    });
  }

  console.log('Inserting into Supabase...');
  
  const { data, error } = await supabase
    .from('system_invitation_codes')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error inserting codes:', error);
    // If table doesn't exist, we might get an error.
    // The user should have run the SQL to create the table, or I can try to use my local DB fallback if this was for local dev.
    // But the request implies "platform-wide" which usually means online/Supabase.
  } else {
    console.log(`Successfully inserted ${data.length} codes.`);
    
    // Save to file for user
    const outputPath = path.join(__dirname, '../docs/invitation_codes.txt');
    fs.writeFileSync(outputPath, codes.join('\n'));
    console.log(`Codes saved to ${outputPath}`);
  }
}

main();
