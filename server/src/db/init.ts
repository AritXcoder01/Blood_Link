import fs from 'fs';
import path from 'path';
import { db } from './connection.js';

export async function initDatabase(): Promise<void> {
  await db.init();

  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await db.exec(schemaSql);
    console.log('✅ [DATABASE] Schema verified and all tables created successfully.');
  } else {
    console.warn(`⚠️ [DATABASE] Schema file not found at ${schemaPath}`);
  }
}
