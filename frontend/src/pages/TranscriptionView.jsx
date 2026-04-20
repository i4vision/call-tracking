import React, { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { API_URL } from '../App';

const ANALYZER_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ],
  google: [
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' }
  ],
  groq: [
    { value: 'llama3-70b-8192', label: 'Llama 3 (70B)' },
    { value: 'llama3-8b-8192', label: 'Llama 3 (8B)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'open-mixtral-8x22b', label: 'Mixtral 8x22B' }
  ],
  xai: [
    { value: 'grok-2-latest', label: 'Grok 2' },
    { value: 'grok-vision-latest', label: 'Grok Vision' }
  ]
};

export default function TranscriptionView({ selectedFiles }) {
  const [transcriberProvider, setTranscriberProvider] = useState('openai');
  const [analyzerProvider, setAnalyzerProvider] = useState('openai');
  const [analyzerVersion, setAnalyzerVersion] = useState(ANALYZER_OPTIONS['openai'][0].value);
  const [customPrompt, setCustomPrompt] = useState('You are an AI tasked with emotional analysis. Respond with EXACTLY ONE WORD from this list based on the transcript: DELIGHTED, SATISFIED, NEUTRAL, CONFUSED, FRUSTRATED, ANGRY, URGENT. Do not include any punctuation or extra words.');
  const [customTranscribePrompt, setCustomTranscribePrompt] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/system-prompt`)
      .then(res => res.json())
      .then(data => {
        if (data.prompt) setCustomPrompt(data.prompt);
        if (data.transcribePrompt) setCustomTranscribePrompt(data.transcribePrompt);
      })
      .catch(err => console.error(err));
  }, []);

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setAnalyzerProvider(newProv);
    setAnalyzerVersion(ANALYZER_OPTIONS[newProv][0].value);
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
          transcriberProvider,
          analyzerProvider,
          analyzerVersion,
          customPrompt,
          customTranscribePrompt
        })
      });
      const data = await response.json();
      if (data.results) {
        setResults(prev => [...data.results, ...prev]);
      } else if (data.error) {
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
         <div style={{fontWeight: 500, color: 'var(--text-secondary)'}}>Audio Intelligence Pipeline</div>
      </div>
      <div className="content-header">
        <h1>Transcribe & Analyze</h1>
        <p>Select your preferred AI engines for transcription and sentiment analysis.</p>
      </div>

      <div className="controls-card">
        <div className="select-group">
          <label>Selected Calls</label>
          <div style={{padding: '10px 15px', background: 'var(--bg-color-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', minWidth: 120}}>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="select-group">
          <label>1. Transcriber AI</label>
          <select value={transcriberProvider} onChange={e => setTranscriberProvider(e.target.value)}>
            <option value="openai">OpenAI Whisper v3</option>
            <option value="groq">Groq Whisper (Ultra-fast)</option>
            <option value="google">Google Gemini Audio</option>
          </select>
        </div>

        <div className="select-group">
          <label>2. Analyzer AI</label>
          <select value={analyzerProvider} onChange={handleProviderChange}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google Gemini</option>
            <option value="groq">Groq (Meta Llama)</option>
            <option value="mistral">Mistral API</option>
            <option value="xai">xAI (Grok)</option>
          </select>
        </div>

        <div className="select-group">
          <label>Model Version</label>
          <select value={analyzerVersion} onChange={e => setAnalyzerVersion(e.target.value)}>
            {ANALYZER_OPTIONS[analyzerProvider].map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="select-group" style={{flexBasis: '100%', marginTop: 10}}>
          <label>Transcription Output Formatting Prompt</label>
          <textarea 
            className="ai-prompt-textarea"
            style={{minHeight: 70}}
            value={customTranscribePrompt} 
            onChange={e => setCustomTranscribePrompt(e.target.value)}
          />
        </div>

        <div className="select-group" style={{flexBasis: '100%', marginTop: 10}}>
          <label>Emotion Engine System Prompt</label>
          <textarea 
            className="ai-prompt-textarea"
            value={customPrompt} 
            onChange={e => setCustomPrompt(e.target.value)}
          />
        </div>

        <div style={{flexBasis: '100%', display: 'flex', justifyContent: 'flex-end'}}>
          <button 
            className="btn-primary" 
            onClick={handleTranscribe}
            disabled={selectedFiles.length === 0 || transcribing}
          >
            {transcribing ? <Loader2 size={18} className="spinner" /> : <Zap size={18} />}
            {transcribing ? 'Processing...' : 'Execute Pipeline'}
          </button>
        </div>
      </div>

      <div className="results-grid">
        {results.map((res, index) => (
          <div key={index} className="result-card">
            <div className="result-header" style={{flexDirection: 'column', gap: 10, alignItems: 'flex-start'}}>
              <span className="result-title" title={res.file} style={{wordBreak: 'break-all'}}>{res.file}</span>
              {res.success ? (
                <div style={{display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap'}}>
                   <span className={`badge`} style={{border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap'}}>{res.data.emotion.toUpperCase()}</span>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Audio: <span style={{color: 'var(--success-color)', fontWeight: 600}}>${Number(res.data.cost_transcribe || 0).toFixed(4)}</span>
                   </span>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Brain: <span style={{color: 'var(--accent-color)', fontWeight: 600}}>${Number(res.data.cost_analyze || 0).toFixed(4)}</span>
                   </span>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Time: <span style={{color: 'var(--text-primary)', fontWeight: 600}}>{Number(res.data.processing_time || 0).toFixed(1)}s</span>
                   </span>
                </div>
              ) : (
                <span className="badge badge-bad">Failed</span>
              )}
            </div>
            
            {res.success && (
              <>
                <div style={{marginBottom: 8}}><span className="badge badge-ai" style={{background: 'rgba(255,255,255,0.05)', color: '#8b949e', border: '1px solid #30363d'}}>{res.data.ai_version.replace(' | ', ' ⚙️ ')}</span></div>
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
