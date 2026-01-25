import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FormEditorPage } from './pages/FormEditorPage';
import { FormViewPage } from './pages/FormViewPage';
import { StatsPage } from './pages/StatsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<FormEditorPage />} />
        <Route path="/forms/:id" element={<FormViewPage />} />
        <Route path="/forms/:id/edit" element={<FormEditorPage />} />
        <Route path="/forms/:id/stats" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
