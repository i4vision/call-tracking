import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Mic, BarChart2, Headphones, Play, Pause, Settings, UploadCloud, Edit2, Trash2 } from 'lucide-react';
import TranscriptionView from './pages/TranscriptionView';
import DashboardView from './pages/DashboardView';
import SettingsModal from './components/SettingsModal';
import FileHistoryModal from './components/FileHistoryModal';
import EditMetadataModal from './components/EditMetadataModal';
import './index.css';

export const API_URL = '/api';

function AppContent() {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingHistoryFile, setViewingHistoryFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const fileInputRef = useRef(null);
  const [playingFile, setPlayingFile] = useState(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
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

  const fetchFiles = () => {
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
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (event) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    for (let i = 0; i < uploadedFiles.length; i++) {
       const formData = new FormData();
       formData.append('audio', uploadedFiles[i]);
       try {
         await fetch(`${API_URL}/upload`, {
           method: 'POST',
           body: formData
         });
       } catch (err) {
         console.error("Upload failed", err);
       }
    }
    fetchFiles();
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleDeleteFile = async (e, filename) => {
    e.stopPropagation();
    if (window.confirm(`Are you absolutely sure you want to delete ${filename}? This natively destroys the physical audio track and wipes all underlying transcription mappings.`)) {
      try {
        const response = await fetch(`${API_URL}/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        if (response.ok) {
           setSelectedFileIds(prev => {
             const newSet = new Set(prev);
             // Find ID and wipe it from bounds
             const target = files.find(f => f.filename === filename);
             if (target) newSet.delete(target.id);
             return newSet;
           });
           if (playingFile === filename) setPlayingFile(null);
           fetchFiles();
        }
      } catch (err) {
        console.error("Deletion API failed", err);
      }
    }
  };

  const uniqueTags = Array.from(new Set(files.flatMap(f => f.tags || []))).sort();
  const filteredFiles = selectedTagFilter 
    ? files.filter(f => (f.tags || []).includes(selectedTagFilter))
    : files;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 style={{display: 'flex', alignItems: 'center'}}><img src="/katia-logo.png" alt="Katia Logo" style={{height: 24, objectFit: 'contain', marginRight: 8}} /> Katia AI</h2>
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
              <Settings size={16} style={{marginRight: 4}}/> Settings
            </button>
          </div>
        </div>
        
        <div className="file-list">
          <div style={{display: 'flex', alignItems: 'center', paddingRight: 12}}>
            <h3 style={{fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '10px 0 10px 12px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0}}>
              Recordings ({filteredFiles.length})
            </h3>
            {uniqueTags.length > 0 && (
              <select 
                value={selectedTagFilter} 
                onChange={e => setSelectedTagFilter(e.target.value)}
                style={{ background: 'var(--bg-color-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, padding: '2px 4px', fontSize: '0.75rem', marginLeft: 8, maxWidth: 100 }}
              >
                <option value="">All Tags</option>
                {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <div style={{ flex: 1 }}></div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{background: 'transparent', border: 'none', color: isUploading ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center'}}
              title="Upload Native Audio"
            >
              <UploadCloud size={16} style={{opacity: isUploading ? 0.6 : 1}} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" multiple hidden />
          </div>
          {loading ? (
            <div style={{padding: 12, color: 'var(--text-secondary)'}}>Loading...</div>
          ) : filteredFiles.length === 0 ? (
            <div style={{padding: 12, color: 'var(--text-secondary)'}}>No matching .mp3 files found.</div>
          ) : (
            filteredFiles.map((file) => (
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingFile(file); }} 
                    style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', transition: 'color 0.2s', marginRight: 4}}
                    title="Edit Audio Mapping"
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteFile(e, file.filename)} 
                    style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', transition: 'color 0.2s'}}
                    title="Delete Audio & Data"
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--error-color)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="file-name" title={file.filename} style={{color: file.translated ? 'var(--success-color)' : 'var(--text-secondary)'}}>
                    {file.filename} {file.notes && <span style={{fontSize: '0.65rem', padding: '0 4px', background: 'rgba(255,255,255,0.1)', borderRadius: 3, verticalAlign: 'middle', marginLeft: 4}}>📝</span>}
                  </span>
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
      {editingFile && (
        <EditMetadataModal 
          file={editingFile} 
          onClose={() => setEditingFile(null)} 
          onSaved={fetchFiles} 
        />
      )}
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
