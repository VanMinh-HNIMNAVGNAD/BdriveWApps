const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Client } = require('pg');

async function fixQuotas() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await client.connect();

  try {
    const usersRes = await client.query('SELECT id, email, storage_used_bytes FROM users');
    for (const user of usersRes.rows) {
      const filesRes = await client.query('SELECT SUM(size_bytes) as total_size FROM files WHERE owner_id = $1 AND type = $2', [user.id, 'file']);
      const totalSize = filesRes.rows[0].total_size || 0;
      
      if (Number(totalSize) !== Number(user.storage_used_bytes)) {
        console.log(`Fixing user ${user.email}: ${user.storage_used_bytes} -> ${totalSize}`);
        await client.query('UPDATE users SET storage_used_bytes = $1 WHERE id = $2', [totalSize, user.id]);
      } else {
        console.log(`User ${user.email} is correct: ${totalSize}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixQuotas();
