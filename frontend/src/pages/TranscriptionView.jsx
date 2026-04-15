import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { API_URL } from '../App';

const AI_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'whisper-1', label: 'Whisper v3' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ],
  meta: [
    { value: 'llama-3-70b', label: 'Llama 3 (70B)' },
    { value: 'llama-3-8b', label: 'Llama 3 (8B)' }
  ],
  mistral: [
    { value: 'mistral-large', label: 'Mistral Large' },
    { value: 'mixtral-8x22b', label: 'Mixtral 8x22B' }
  ]
};

export default function TranscriptionView({ selectedFiles }) {
  const [provider, setProvider] = useState('openai');
  const [version, setVersion] = useState(AI_OPTIONS['openai'][0].value);
  const [transcribing, setTranscribing] = useState(false);
  const [results, setResults] = useState([]);

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setProvider(newProv);
    setVersion(AI_OPTIONS[newProv][0].value);
  };

  const handleTranscribe = async () => {
    if (selectedFiles.length === 0) return;
    setTranscribing(true);
    
    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFiles.map(f => f.filename),
          provider,
          version
        })
      });
      const data = await response.json();
      if (data.results) {
        setResults(prev => [...data.results, ...prev]);
      } else if (data.error) {
        // Handle global error like missing API key gracefully
        setResults(prev => [{ file: 'System Error', success: false, error: data.error }, ...prev]);
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
          <div style={{padding: '10px 15px', background: 'var(--bg-color-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', minWidth: 150}}>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready
          </div>
        </div>

        <div className="select-group">
          <label>AI Provider</label>
          <select value={provider} onChange={handleProviderChange}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google Gemini</option>
            <option value="meta">Meta Llama 3</option>
            <option value="mistral">Mistral AI</option>
          </select>
        </div>

        <div className="select-group">
          <label>Model Version</label>
          <select value={version} onChange={e => setVersion(e.target.value)}>
            {AI_OPTIONS[provider].map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
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
                <div style={{marginBottom: 8}}><span className="badge badge-ai">{res.data.ai_version.replace(' ', ' / ')}</span></div>
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
