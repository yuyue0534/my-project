import React, { useState } from 'react';
import { FIELD_TYPES } from '../utils/api';

export function FieldEditor({ field, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = (updates) => {
    onUpdate({ ...field, ...updates });
  };

  const addOption = () => {
    const options = field.options || [];
    updateField({ options: [...options, `选项 ${options.length + 1}`] });
  };

  const updateOption = (index, value) => {
    const options = [...(field.options || [])];
    options[index] = value;
    updateField({ options });
  };

  const removeOption = (index) => {
    const options = (field.options || []).filter((_, i) => i !== index);
    updateField({ options });
  };

  const needsOptions = ['radio', 'checkbox', 'select'].includes(field.type);

  return (
    <div className="card p-4 animate-in">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
            title="上移"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
            title="下移"
          >
            ↓
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={field.type}
              onChange={(e) => updateField({ type: e.target.value, options: [] })}
              className="input w-40"
            >
              {FIELD_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
              placeholder="字段标题"
              className="input flex-1"
            />

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => updateField({ required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-slate-600">必填</span>
            </label>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-ghost btn-sm"
            >
              {isExpanded ? '收起' : '展开'}
            </button>

            <button
              onClick={onDelete}
              className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>

          {isExpanded && (
            <div className="space-y-3 pl-4 border-l-2 border-slate-200">
              <div>
                <label className="label">字段描述（可选）</label>
                <input
                  type="text"
                  value={field.description || ''}
                  onChange={(e) => updateField({ description: e.target.value })}
                  placeholder="帮助文字或说明"
                  className="input"
                />
              </div>

              <div>
                <label className="label">占位符（可选）</label>
                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => updateField({ placeholder: e.target.value })}
                  placeholder="输入框提示文字"
                  className="input"
                />
              </div>

              {needsOptions && (
                <div>
                  <label className="label">选项设置</label>
                  <div className="space-y-2">
                    {(field.options || []).map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          className="input flex-1"
                          placeholder={`选项 ${idx + 1}`}
                        />
                        <button
                          onClick={() => removeOption(idx)}
                          className="btn btn-ghost btn-sm text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="btn btn-secondary btn-sm w-full"
                    >
                      + 添加选项
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
