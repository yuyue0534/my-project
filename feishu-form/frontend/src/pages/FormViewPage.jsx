import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormField } from '../components/FormField';
import { api } from '../utils/api';

export function FormViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadForm();
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

  const handleFieldChange = (fieldId, value) => {
    setFormData({ ...formData, [fieldId]: value });
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    for (const field of form.fields) {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
          newErrors[field.id] = '此字段为必填项';
        }
      }
      
      // Email 验证
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = '请输入有效的邮箱地址';
        }
      }
      
      // Phone 验证
      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(formData[field.id])) {
          newErrors[field.id] = '请输入有效的手机号';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await api.submitForm(id, { data: formData });
      setSubmitted(true);
    } catch (error) {
      alert('提交失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">提交成功！</h2>
          <p className="text-lg text-slate-600 mb-8">
            感谢你的填写，我们已收到你的回复
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({});
              }}
              className="btn btn-secondary btn-md"
            >
              再次填写
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary btn-md"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost btn-sm mb-6"
          >
            ← 返回
          </button>
          
          <div className="card p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-lg text-slate-600">
                {form.description}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.fields.map((field, index) => (
            <div key={field.id} className="card p-6">
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-slate-400 mt-2">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <FormField
                    field={field}
                    value={formData[field.id]}
                    onChange={handleFieldChange}
                    error={errors[field.id]}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="card p-6">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg w-full shadow-lg shadow-blue-200"
            >
              {submitting ? '提交中...' : '提交表单'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
