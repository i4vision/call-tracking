import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { API_URL } from '../App';

export default function TranscriptionView({ selectedFiles }) {
  const [model, setModel] = useState('gpt-4o');
  const [transcribing, setTranscribing] = useState(false);
  const [results, setResults] = useState([]);

  const handleTranscribe = async () => {
    if (selectedFiles.length === 0) return;
    setTranscribing(true);
    
    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFiles.map(f => f.filename),
          model
        })
      });
      const data = await response.json();
      if (data.results) {
        setResults(prev => [...data.results, ...prev]);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <>
      <div className="topbar">
         <div style={{fontWeight: 500, color: 'var(--text-secondary)'}}>Audio Intelligence</div>
      </div>
      <div className="content-header">
        <h1>Transcribe Calls</h1>
        <p>Select multiple calls from the sidebar to begin batch transcription and emotional analysis.</p>
      </div>

      <div className="controls-card">
        <div className="select-group">
          <label>Selected Calls</label>
          <div style={{padding: '10px 15px', background: 'var(--bg-color-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', minWidth: 200}}>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready
          </div>
        </div>

        <div className="select-group">
          <label>AI Model & Version</label>
          <select value={model} onChange={e => setModel(e.target.value)}>
            <option value="gpt-4o">OpenAI GPT-4o (High Accuracy)</option>
            <option value="gpt-4-turbo">OpenAI GPT-4 Turbo</option>
            <option value="whisper-1">OpenAI Whisper (Audio native)</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
          </select>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleTranscribe}
          disabled={selectedFiles.length === 0 || transcribing}
        >
          {transcribing ? <Loader2 size={18} className="spinner" /> : <Zap size={18} />}
          {transcribing ? 'Processing...' : 'Transcribe Selected'}
        </button>
      </div>

      <div className="results-grid">
        {results.map((res, index) => (
          <div key={index} className="result-card">
            <div className="result-header">
              <span className="result-title" title={res.file}>{res.file.substring(0, 25)}{res.file.length > 25 ? '...' : ''}</span>
              {res.success ? (
                <span className={`badge badge-${res.data.emotion}`}>{res.data.emotion}</span>
              ) : (
                <span className="badge badge-bad">Failed</span>
              )}
            </div>
            
            {res.success && (
              <>
                <div style={{marginBottom: 8}}><span className="badge badge-ai">{res.data.ai_version}</span></div>
                <div className="result-transcript">
                  {res.data.transcript}
                </div>
              </>
            )}
            {!res.success && <div className="result-transcript" style={{color: 'var(--danger-color)'}}>{res.error}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
