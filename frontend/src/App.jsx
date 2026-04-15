import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Mic, BarChart2, Headphones, FileAudio } from 'lucide-react';
import TranscriptionView from './pages/TranscriptionView';
import DashboardView from './pages/DashboardView';
import './index.css';

// Central API URL
// Uses dynamic relative path to support any random Portainer port
export const API_URL = '/api';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/files`)
      .then(res => res.json())
      .then(data => {
        if(data.files) setFiles(data.files);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch files', err);
        setLoading(false);
      });
  }, []);

  const toggleFile = (id) => {
    const newSel = new Set(selectedFileIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedFileIds(newSel);
  };

  const getSelectedFiles = () => {
    return files.filter(f => selectedFileIds.has(f.id));
  };

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2><Headphones size={24} color="var(--accent-color)" /> OpenPhone AI</h2>
            <div className="nav-links">
              <NavLink 
                to="/" 
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
              >
                <Mic size={16} style={{marginRight: 4}}/> Transcribe
              </NavLink>
              <NavLink 
                to="/dashboard" 
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
              >
                <BarChart2 size={16} style={{marginRight: 4}}/> Dashboard
              </NavLink>
            </div>
          </div>
          
          <div className="file-list">
            <h3 style={{fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '10px 12px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              Recordings ({files.length})
            </h3>
            {loading ? (
              <div style={{padding: 12, color: 'var(--text-secondary)'}}>Loading...</div>
            ) : files.length === 0 ? (
              <div style={{padding: 12, color: 'var(--text-secondary)'}}>No .mp3 files found.</div>
            ) : (
              files.map((file) => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => toggleFile(file.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedFileIds.has(file.id)}
                    onChange={() => {}} // handled by parent onClick
                  />
                  <FileAudio size={18} className="file-icon" />
                  <span className="file-name" title={file.filename}>{file.filename}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TranscriptionView selectedFiles={getSelectedFiles()} />} />
            <Route path="/dashboard" element={<DashboardView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
