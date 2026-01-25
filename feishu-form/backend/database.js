import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 初始化数据库
 * @returns {Promise<import('sqlite').Database>}
 */
export async function initDatabase() {
  const db = await open({
    filename: join(__dirname, 'feishu-form.db'),
    driver: sqlite3.Database
  });

  // 开启外键支持（sqlite 默认关闭）
  await db.exec('PRAGMA foreign_keys = ON;');

  // 表单表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      fields TEXT NOT NULL,
      settings TEXT,
      creator TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 表单提交表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      data TEXT NOT NULL,
      submitter TEXT,
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );
  `);

  // 索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_form_created
      ON forms(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_submission_form
      ON submissions(form_id);

    CREATE INDEX IF NOT EXISTS idx_submission_time
      ON submissions(submitted_at DESC);
  `);

  console.log('✅ Database initialized (sqlite3)');

  return db;
}
