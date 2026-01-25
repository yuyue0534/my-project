import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, formatDate } from '../utils/api';

export function StatsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [formData, statsData, submissionsData] = await Promise.all([
        api.getForm(id),
        api.getStats(id),
        api.getSubmissions(id)
      ]);
      
      setForm(formData.form);
      setStats(statsData);
      setSubmissions(submissionsData.submissions);
    } catch (error) {
      alert('加载数据失败：' + error.message);
      navigate('/');
    } finally {
      setLoading(false);
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
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-ghost btn-sm"
              >
                ← 返回
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{form.title}</h1>
                <p className="text-sm text-slate-500">数据统计与分析</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={`/forms/${id}`} className="btn btn-secondary btn-md">
                查看表单
              </Link>
              <Link to={`/forms/${id}/edit`} className="btn btn-secondary btn-md">
                编辑表单
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 统计概览
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'responses'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 回复列表
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="text-sm text-slate-600 mb-1">总回复数</div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalSubmissions}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm text-slate-600 mb-1">字段数量</div>
                <div className="text-3xl font-bold text-slate-900">{form.fields.length}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm text-slate-600 mb-1">平均完成率</div>
                <div className="text-3xl font-bold text-slate-900">
                  {stats.totalSubmissions > 0 ? '100%' : '0%'}
                </div>
              </div>
            </div>

            {/* Field Statistics */}
            <div className="space-y-6">
              {form.fields.map((field) => {
                const fieldStats = stats.stats[field.id];
                if (!fieldStats) return null;

                return (
                  <div key={field.id} className="card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      {field.label}
                      <span className="ml-3 text-sm font-normal text-slate-500">
                        {fieldStats.totalResponses} 个回复
                      </span>
                    </h3>

                    {fieldStats.distribution && (
                      <div className="space-y-3">
                        {Object.entries(fieldStats.distribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([option, count]) => {
                            const percentage = (count / fieldStats.totalResponses * 100).toFixed(1);
                            return (
                              <div key={option} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700">{option}</span>
                                  <span className="text-slate-500">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {!fieldStats.distribution && fieldStats.data.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {fieldStats.data.slice(0, 10).map((value, idx) => (
                          <div key={idx} className="text-sm text-slate-600 py-2 px-3 bg-slate-50 rounded">
                            {value}
                          </div>
                        ))}
                        {fieldStats.data.length > 10 && (
                          <div className="text-sm text-slate-500 text-center py-2">
                            还有 {fieldStats.data.length - 10} 条回复...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="space-y-6">
            {submissions.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-slate-400 mb-4">
                  <span className="text-6xl">📭</span>
                </div>
                <p className="text-lg text-slate-600">还没有收到任何回复</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission, idx) => (
                  <div key={submission.id} className="card p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {submission.submitter || '匿名用户'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatDate(submission.submitted_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {form.fields.map((field) => {
                        const value = submission.data[field.id];
                        if (value === undefined || value === null || value === '') return null;

                        return (
                          <div key={field.id}>
                            <div className="text-sm font-medium text-slate-700 mb-1">
                              {field.label}
                            </div>
                            <div className="text-slate-900">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
