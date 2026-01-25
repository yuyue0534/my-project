import React from 'react';

export function FormField({ field, value, onChange, error }) {
  const handleChange = (e) => {
    const newValue = e.target.type === 'checkbox' 
      ? e.target.checked 
        ? [...(value || []), e.target.value]
        : (value || []).filter(v => v !== e.target.value)
      : e.target.value;
    onChange(field.id, newValue);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            className="input"
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder || `请输入${field.label}`}
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            className="input min-h-[100px] resize-y"
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder || `请输入${field.label}`}
            required={field.required}
            rows={4}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            className="input"
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder || `请输入${field.label}`}
            required={field.required}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            className="input"
            value={value || ''}
            onChange={handleChange}
            required={field.required}
          />
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={handleChange}
                  required={field.required}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  value={option}
                  checked={(value || []).includes(option)}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'select':
        return (
          <select
            className="input"
            value={value || ''}
            onChange={handleChange}
            required={field.required}
          >
            <option value="">请选择...</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      
      default:
        return <div className="text-slate-400">不支持的字段类型</div>;
    }
  };

  return (
    <div className="space-y-2">
      <label className="label">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-slate-500 -mt-1">{field.description}</p>
      )}
      {renderField()}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
