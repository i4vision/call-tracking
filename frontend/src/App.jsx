import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Mic, BarChart2, Headphones, Play, Pause, Settings } from 'lucide-react';
import TranscriptionView from './pages/TranscriptionView';
import DashboardView from './pages/DashboardView';
import SettingsModal from './components/SettingsModal';
import FileHistoryModal from './components/FileHistoryModal';
import './index.css';

export const API_URL = '/api';

function AppContent() {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingHistoryFile, setViewingHistoryFile] = useState(null);
  const [playingFile, setPlayingFile] = useState(null);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (playingFile && audioRef.current) {
      audioRef.current.src = `${API_URL}/audio/${encodeURIComponent(playingFile)}`;
      audioRef.current.play().catch(e => {
        console.error("Audio playback failed natively", e);
        setPlayingFile(null);
      });
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [playingFile]);

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
    navigate('/');
  };

  const togglePlay = (e, filename) => {
    if (e) e.stopPropagation();
    if (playingFile === filename) {
      setPlayingFile(null);
    } else {
      setPlayingFile(filename);
    }
  };

  const getSelectedFiles = () => {
    return files.filter(f => selectedFileIds.has(f.id));
  };

  return (
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
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="nav-link"
              style={{background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center'}}
            >
              <Settings size={16} style={{marginRight: 4}}/> API Keys
            </button>
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
                onClick={() => setViewingHistoryFile(file.filename)}
              >
                <input 
                  type="checkbox" 
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => toggleFile(file.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                  <button 
                    onClick={(e) => togglePlay(e, file.filename)} 
                    className={`play-btn ${playingFile === file.filename ? 'active' : ''}`}
                    title="Play Audio"
                  >
                    {playingFile === file.filename ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
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
      
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {viewingHistoryFile && (
        <FileHistoryModal 
          filename={viewingHistoryFile} 
          onClose={() => setViewingHistoryFile(null)} 
          playingFile={playingFile}
          togglePlay={togglePlay}
          audioRef={audioRef}
        />
      )}
      
      <audio ref={audioRef} onEnded={() => setPlayingFile(null)} style={{display: 'none'}} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
