import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FieldEditor } from '../components/FieldEditor';
import { api, generateId, FIELD_TYPES } from '../utils/api';

export function FormEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    fields: [],
    settings: {
      allowMultiple: true,
      submitLimit: false,
    }
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      const data = await api.getForm(id);
      setForm(data.form);
    } catch (error) {
      alert('加载表单失败：' + error.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const addField = (type = 'text') => {
    const newField = {
      id: generateId(),
      type,
      label: `新字段 ${form.fields.length + 1}`,
      required: false,
      options: ['radio', 'checkbox', 'select'].includes(type) ? ['选项1', '选项2'] : undefined
    };
    setForm({ ...form, fields: [...form.fields, newField] });
  };

  const updateField = (index, updates) => {
    const newFields = [...form.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setForm({ ...form, fields: newFields });
  };

  const deleteField = (index) => {
    setForm({ ...form, fields: form.fields.filter((_, i) => i !== index) });
  };

  const moveField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.fields.length) return;
    
    const newFields = [...form.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setForm({ ...form, fields: newFields });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('请输入表单标题');
      return;
    }

    if (form.fields.length === 0) {
      alert('请至少添加一个字段');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateForm(id, form);
        alert('保存成功！');
      } else {
        const result = await api.createForm(form);
        alert('创建成功！');
        navigate(`/forms/${result.id}`);
      }
    } catch (error) {
      alert('保存失败：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-ghost btn-sm"
              >
                ← 返回
              </button>
              <h1 className="text-xl font-bold text-slate-900">
                {isEdit ? '编辑表单' : '创建表单'}
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary btn-md"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary btn-md"
              >
                {saving ? '保存中...' : isEdit ? '保存修改' : '创建表单'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Form Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">表单标题 *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例如：客户满意度调查"
                    className="input text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="label">表单描述（可选）</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="简单介绍这个表单的用途..."
                    className="input min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">表单字段</h2>
                <div className="relative group">
                  <button className="btn btn-primary btn-sm">
                    + 添加字段
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {FIELD_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => addField(type.value)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg text-sm flex items-center gap-2"
                      >
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {form.fields.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="mb-4">还没有添加任何字段</p>
                    <p className="text-sm">点击右上角"添加字段"开始创建</p>
                  </div>
                ) : (
                  form.fields.map((field, index) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      onUpdate={(updates) => updateField(index, updates)}
                      onDelete={() => deleteField(index)}
                      onMoveUp={() => moveField(index, -1)}
                      onMoveDown={() => moveField(index, 1)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">表单设置</h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.settings.allowMultiple}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, allowMultiple: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 text-sm">允许重复提交</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      同一用户可以多次填写表单
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="card p-6 bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">💡 快速提示</h3>
              <ul className="space-y-2 text-xs text-blue-800">
                <li>• 使用简洁的标题和清晰的字段名</li>
                <li>• 只标记真正必填的字段</li>
                <li>• 添加描述帮助填写者理解</li>
                <li>• 保持表单简短，提高完成率</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
