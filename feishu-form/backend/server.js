import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase } from './database.js';
import { nanoid } from './utils.js';

const fastify = Fastify({ logger: true });
const db = await initDatabase();

// CORS
await fastify.register(cors, {
  origin: true
});

async function stmtAll(sql, ...params) {
  const stmt = await db.prepare(sql);
  try {
    return await stmt.all(...params);
  } finally {
    // sqlite 的 statement 通常需要 finalize；如果你的驱动没有也不影响
    if (typeof stmt.finalize === 'function') await stmt.finalize();
  }
}

async function stmtGet(sql, ...params) {
  const stmt = await db.prepare(sql);
  try {
    return await stmt.get(...params);
  } finally {
    if (typeof stmt.finalize === 'function') await stmt.finalize();
  }
}

async function stmtRun(sql, ...params) {
  const stmt = await db.prepare(sql);
  try {
    return await stmt.run(...params);
  } finally {
    if (typeof stmt.finalize === 'function') await stmt.finalize();
  }
}

// ==================== 表单 API ====================

// 获取所有表单
fastify.get('/api/forms', async (request, reply) => {
  const forms =await stmtAll(`
    SELECT id, title, description, creator, created_at, updated_at,
           (SELECT COUNT(*) FROM submissions WHERE form_id = forms.id) as submission_count
    FROM forms 
    ORDER BY created_at DESC
  `);

  return { forms };
});

// 获取单个表单
fastify.get('/api/forms/:id', async (request, reply) => {
  const { id } = request.params;

  const form = await stmtGet(`SELECT * FROM forms WHERE id = ?`, id);

  if (!form) {
    return reply.code(404).send({ error: 'Form not found' });
  }

  // 解析 JSON 字段
  form.fields = JSON.parse(form.fields);
  form.settings = form.settings ? JSON.parse(form.settings) : {};

  return { form };
});

// 创建表单
fastify.post('/api/forms', async (request, reply) => {
  const { title, description, fields, settings, creator } = request.body;

  if (!title || !fields || !Array.isArray(fields)) {
    return reply.code(400).send({ error: 'Invalid form data' });
  }

  const id = nanoid();
  const now = Date.now();

  await stmtRun(`
    INSERT INTO forms (id, title, description, fields, settings, creator, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    id,
    title,
    description || '',
    JSON.stringify(fields),
    JSON.stringify(settings || {}),
    creator || 'anonymous',
    now,
    now
  );

  return { id, message: 'Form created successfully' };
});

// 更新表单
fastify.put('/api/forms/:id', async (request, reply) => {
  const { id } = request.params;
  const { title, description, fields, settings } = request.body;

  const form = await stmtGet('SELECT id FROM forms WHERE id = ?', id);
  if (!form) {
    return reply.code(404).send({ error: 'Form not found' });
  }

  await stmtRun(`
    UPDATE forms 
    SET title = ?, description = ?, fields = ?, settings = ?, updated_at = ?
    WHERE id = ?
  `,
    title,
    description || '',
    JSON.stringify(fields),
    JSON.stringify(settings || {}),
    Date.now(),
    id
  );

  return { message: 'Form updated successfully' };
});

// 删除表单
fastify.delete('/api/forms/:id', async (request, reply) => {
  const { id } = request.params;

  const result = await stmtRun('DELETE FROM forms WHERE id = ?', id);

  if (result.changes === 0) {
    return reply.code(404).send({ error: 'Form not found' });
  }

  return { message: 'Form deleted successfully' };
});

// ==================== 提交 API ====================

// 提交表单数据
fastify.post('/api/forms/:id/submit', async (request, reply) => {
  const { id } = request.params;
  const { data, submitter } = request.body;

  // 验证表单存在
  const form = await stmtGet('SELECT fields, settings FROM forms WHERE id = ?', id);
  if (!form) {
    return reply.code(404).send({ error: 'Form not found' });
  }

  const fields = JSON.parse(form.fields);
  const settings = JSON.parse(form.settings || '{}');

  // 简单验证：检查必填字段
  for (const field of fields) {
    if (field.required && (!data[field.id] || data[field.id] === '')) {
      return reply.code(400).send({
        error: `Field "${field.label}" is required`
      });
    }
  }

  // 检查提交权限
  if (settings.submitLimit && !settings.allowMultiple) {
    const existing = await stmtGet(
      'SELECT id FROM submissions WHERE form_id = ? AND submitter = ?',
      id,
      submitter || 'anonymous'
    );

    if (existing) {
      return reply.code(403).send({
        error: 'You have already submitted this form'
      });
    }
  }

  const submissionId = nanoid();

  await stmtRun(`
    INSERT INTO submissions (id, form_id, data, submitter, submitted_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    submissionId,
    id,
    JSON.stringify(data),
    submitter || 'anonymous',
    Date.now()
  );

  return {
    id: submissionId,
    message: 'Submission successful'
  };
});

// 获取表单的所有提交
fastify.get('/api/forms/:id/submissions', async (request, reply) => {
  const { id } = request.params;

  const submissions = await stmtAll(`
    SELECT id, data, submitter, submitted_at
    FROM submissions 
    WHERE form_id = ?
    ORDER BY submitted_at DESC
  `, id);

  // 解析 JSON 数据
  const parsedSubmissions = submissions.map(sub => ({
    ...sub,
    data: JSON.parse(sub.data)
  }));

  return { submissions: parsedSubmissions };
});

// 获取表单统计
fastify.get('/api/forms/:id/stats', async (request, reply) => {
  const { id } = request.params;

  const form = await stmtGet('SELECT fields FROM forms WHERE id = ?', id);
  if (!form) {
    return reply.code(404).send({ error: 'Form not found' });
  }

  const fields = JSON.parse(form.fields);
  const submissions = await stmtAll('SELECT data FROM submissions WHERE form_id = ?', id);

  // 统计每个字段的数据
  const stats = {};

  for (const field of fields) {
    const fieldData = submissions
      .map(sub => JSON.parse(sub.data)[field.id])
      .filter(val => val !== undefined && val !== null && val !== '');

    stats[field.id] = {
      label: field.label,
      type: field.type,
      totalResponses: fieldData.length,
      data: fieldData
    };

    // 对于单选/多选，统计选项分布
    if (field.type === 'radio' || field.type === 'select') {
      const distribution = {};
      fieldData.forEach(val => {
        distribution[val] = (distribution[val] || 0) + 1;
      });
      stats[field.id].distribution = distribution;
    }

    if (field.type === 'checkbox') {
      const distribution = {};
      fieldData.forEach(values => {
        if (Array.isArray(values)) {
          values.forEach(val => {
            distribution[val] = (distribution[val] || 0) + 1;
          });
        }
      });
      stats[field.id].distribution = distribution;
    }
  }

  return {
    totalSubmissions: submissions.length,
    stats
  };
});

// 健康检查
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
