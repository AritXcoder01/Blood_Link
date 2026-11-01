import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

class DatabaseConnection {
  private pgPool: pg.Pool | null = null;
  private sqliteDb: SqlJsDatabase | null = null;
  private dbPath: string;
  private activeMode: 'postgres' | 'sqlite' = 'sqlite';
  private initialized = false;

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'blood_link.db');
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    if (config.dbClient === 'postgres') {
      try {
        console.log(`[DATABASE] Attempting connection to PostgreSQL at ${config.databaseUrl}...`);
        this.pgPool = new Pool({
          connectionString: config.databaseUrl,
          connectionTimeoutMillis: 3000,
        });

        // Test connection
        const client = await this.pgPool.connect();
        client.release();
        this.activeMode = 'postgres';
        console.log('✅ [DATABASE] Successfully connected to PostgreSQL (Production Mode).');
        this.initialized = true;
        return;
      } catch (err: any) {
        console.warn('⚠️ [DATABASE] PostgreSQL connection failed:', err.message);
        console.warn('⚠️ [DATABASE] Switching to SQLite WebAssembly Development Fallback Mode as requested.');
      }
    }

    // Initialize SQLite (sql.js)
    try {
      const SQL = await initSqlJs();
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.sqliteDb = new SQL.Database(fileBuffer);
        console.log(`✅ [DATABASE] Loaded existing SQLite database from ${this.dbPath}`);
      } else {
        this.sqliteDb = new SQL.Database();
        this.persistSqlite();
        console.log(`✅ [DATABASE] Created new SQLite database at ${this.dbPath}`);
      }
      this.activeMode = 'sqlite';
      console.log('ℹ️ [DATABASE] Running in SQLite Development Fallback Mode (Zero-Config Demonstrable Mode).');
      this.initialized = true;
    } catch (err: any) {
      console.error('❌ [DATABASE] Failed to initialize SQLite database:', err);
      throw err;
    }
  }

  private persistSqlite(): void {
    if (this.sqliteDb) {
      const data = this.sqliteDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  getMode(): 'postgres' | 'sqlite' {
    return this.activeMode;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.initialized) await this.init();

    if (this.activeMode === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return res.rows as T[];
    } else if (this.sqliteDb) {
      // Normalize $1, $2, ... to ? for SQLite
      let sqliteSql = sql.replace(/\$(\d+)/g, '?');
      
      // Convert boolean params to 1/0 for SQLite
      const normalizedParams = params.map(p => {
        if (typeof p === 'boolean') return p ? 1 : 0;
        return p;
      });

      try {
        const stmt = this.sqliteDb.prepare(sqliteSql);
        stmt.bind(normalizedParams);
        const results: T[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject() as any;
          results.push(row);
        }
        stmt.free();
        return results;
      } catch (err: any) {
        console.error(`[SQLITE ERROR] Query failed: ${sqliteSql}`, err);
        throw err;
      }
    }
    throw new Error('Database not initialized');
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (!this.initialized) await this.init();

    if (this.activeMode === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return { changes: res.rowCount || 0 };
    } else if (this.sqliteDb) {
      let sqliteSql = sql.replace(/\$(\d+)/g, '?');
      const normalizedParams = params.map(p => {
        if (typeof p === 'boolean') return p ? 1 : 0;
        return p;
      });

      try {
        this.sqliteDb.run(sqliteSql, normalizedParams);
        this.persistSqlite();
        return { changes: 1 };
      } catch (err: any) {
        console.error(`[SQLITE ERROR] Run failed: ${sqliteSql}`, err);
        throw err;
      }
    }
    throw new Error('Database not initialized');
  }

  async exec(sqlStatements: string): Promise<void> {
    if (!this.initialized) await this.init();

    if (this.activeMode === 'postgres' && this.pgPool) {
      await this.pgPool.query(sqlStatements);
    } else if (this.sqliteDb) {
      // Strip PostgreSQL specific extensions / casts for SQLite compatibility
      const cleaned = sqlStatements
        .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/gi, '')
        .replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME')
        .replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'REAL')
        .replace(/BOOLEAN/gi, 'INTEGER')
        .replace(/TRUE/gi, '1')
        .replace(/FALSE/gi, '0');

      this.sqliteDb.exec(cleaned);
      this.persistSqlite();
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.sqliteDb) {
      this.persistSqlite();
      this.sqliteDb.close();
    }
    this.initialized = false;
  }
}

export const db = new DatabaseConnection();
