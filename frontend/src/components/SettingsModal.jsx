import React, { useState, useEffect } from 'react';
import { X, Key, Save, CheckCircle } from 'lucide-react';
import { API_URL } from '../App';

export default function SettingsModal({ onClose }) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [prompt, setPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState(false);
  
  const [existing, setExisting] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/credentials`)
      .then(res => res.json())
      .then(data => {
        if (data.credentials) setExisting(data.credentials.map(c => c.provider));
      })
      .catch(err => console.error(err));
      
    fetch(`${API_URL}/system-prompt`)
      .then(res => res.json())
      .then(data => {
         if (data.prompt) setPrompt(data.prompt);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`${API_URL}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey })
      });
      setSaved(true);
      if (!existing.includes(provider)) setExisting([...existing, provider]);
      setTimeout(() => setSaved(false), 2000);
      setApiKey(''); // clear field after save
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    setSavedPrompt(false);
    try {
      await fetch(`${API_URL}/system-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      setSavedPrompt(true);
      setTimeout(() => setSavedPrompt(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto'}}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2><Key size={20} color="var(--accent-color)" style={{marginRight: 8}} /> Global Settings</h2>
          <p>Configure API keys and adjust default application behaviors securely.</p>
        </div>
        
        <div className="modal-body">
          <div className="select-group" style={{marginBottom: 20}}>
            <label>AI Provider</label>
            <select value={provider} onChange={e => { setProvider(e.target.value); setApiKey(''); }}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
              <option value="groq">Groq (Meta Llama 3)</option>
              <option value="mistral">Mistral API</option>
            </select>
          </div>

          <div className="select-group" style={{marginBottom: 20}}>
            <label style={{display: 'flex', justifyContent: 'space-between'}}>
              API Key 
              {existing.includes(provider) && <span style={{color: 'var(--success-color)'}}>✓ Configured</span>}
            </label>
            <input 
              type="password" 
              className="key-input"
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder={existing.includes(provider) ? "••••••••••••••••••••• (Enter new key to overwrite)" : "sk-..."}
            />
          </div>

          <button 
            className="btn-primary" 
            style={{width: '100%', justifyContent: 'center', margin: 0}}
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
          >
            {saving ? 'Saving...' : saved ? <><CheckCircle size={18}/> Saved!</> : <><Save size={18}/> Save API Key</>}
          </button>
          
          <div style={{height: 1, background: 'var(--border-color)', margin: '30px 0'}}></div>
          
          <h3 style={{marginBottom: 15, fontSize: '1rem'}}>AI Analysis Preferences</h3>
          
          <div className="select-group" style={{flexBasis: '100%', marginBottom: 20}}>
            <label>Default Emotion System Prompt</label>
            <textarea 
              className="ai-prompt-textarea"
              style={{height: 100}}
              value={prompt} 
              onChange={e => setPrompt(e.target.value)}
            />
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8}}>This predefined prompt is used directly on the Transcribe dashboard specifically.</p>
          </div>
          
          <button 
            className="btn-primary" 
            style={{width: '100%', justifyContent: 'center', margin: 0}}
            onClick={handleSavePrompt}
            disabled={savingPrompt || !prompt.trim()}
          >
            {savingPrompt ? 'Saving...' : savedPrompt ? <><CheckCircle size={18}/> Applied!</> : <><Save size={18}/> Set Default Prompt</>}
          </button>

        </div>
      </div>
    </div>
  );
}
