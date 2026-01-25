import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate } from '../utils/api';

export function HomePage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const data = await api.getForms();
      setForms(data.forms);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!confirm('确定要删除这个表单吗？')) return;

    try {
      await api.deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
    } catch (error) {
      alert('删除失败：' + error.message);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                F
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">飞书表单</h1>
                <p className="text-xs text-slate-500">3分钟创建协作表单</p>
              </div>
            </div>
            <Link to="/create" className="btn btn-primary btn-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300">
              ✨ 创建表单
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {forms.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">📝</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">开始创建你的第一个表单</h2>
              <p className="text-lg text-slate-600 max-w-md mx-auto">
                简单、快速、协作 - 只需3分钟即可创建专业的数据收集表单
              </p>
            </div>
            <Link to="/create" className="btn btn-primary btn-lg shadow-lg shadow-blue-200">
              立即创建 →
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">我的表单</h2>
              <p className="text-slate-600">共 {forms.length} 个表单</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <div
                  key={form.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/forms/${form.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/forms/${form.id}`);
                  }}
                  className="card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                        {form.title}
                      </h3>
                      {form.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {form.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>📊</span>
                        {form.submission_count || 0} 条回复
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{formatDate(form.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Link
                      to={`/forms/${form.id}/edit`}
                      className="btn btn-secondary btn-sm flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      编辑
                    </Link>
                    <Link
                      to={`/forms/${form.id}/stats`}
                      className="btn btn-secondary btn-sm flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      统计
                    </Link>
                    <button
                      onClick={(e) => handleDelete(form.id, e)}
                      className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
