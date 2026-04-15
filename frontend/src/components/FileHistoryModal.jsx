import React, { useEffect, useState } from 'react';
import { X, Mic, Layers, Clock, Activity, FileText } from 'lucide-react';
import { API_URL } from '../App';

export default function FileHistoryModal({ filename, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filename) return;
    setLoading(true);
    fetch(`${API_URL}/calls/${filename}`)
      .then(r => r.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [filename]);

  if (!filename) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column'}} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2><Layers size={20} color="var(--accent-color)" style={{marginRight: 8}} /> Recording History Logs</h2>
          <p style={{fontFamily: 'monospace', wordBreak: 'break-all'}}>{filename}</p>
        </div>
        
        <div className="modal-body" style={{overflowY: 'auto', flex: 1, padding: '20px 30px', display: 'flex', flexDirection: 'column', gap: 30}}>
          {loading ? (
             <div style={{color: 'var(--text-secondary)'}}>Scanning database...</div>
          ) : history.length === 0 ? (
             <div style={{color: 'var(--text-secondary)'}}>No historical AI transcriptions exist for this recording yet.</div>
          ) : (
            history.map((call, idx) => (
              <div key={call.id} style={{background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottom: '1px solid var(--border-color)'}}>
                  <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>V.{history.length - idx} • {new Date(call.created_at).toLocaleString()}</div>
                  <span className={`badge`} style={{border: '1px solid rgba(255,255,255,0.2)'}}>{call.emotion.toUpperCase()}</span>
                </div>

                <div style={{display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 20}}>
                  <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}>Processing Unit</div>
                    <div style={{color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'monospace'}}>{call.ai_version.replace(' | ', ' ⚙️ ')}</div>
                  </div>
                  <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}><Clock size={12}/> Time & Cost</div>
                    <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem'}}>{Number(call.processing_time).toFixed(1)}s • <span style={{color: 'var(--success-color)'}}>${Number(call.cost).toFixed(4)}</span></div>
                  </div>
                </div>

                <div style={{marginBottom: 20}}>
                   <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8}}>System Prompt</div>
                   <div style={{padding: '10px 15px', background: 'var(--bg-color-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                     {call.system_prompt || 'Default hardcoded prompt'}
                   </div>
                </div>

                <div>
                   <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5}}><FileText size={14}/> Extracted Translation</div>
                   <div style={{padding: 20, background: 'var(--bg-color-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', lineHeight: 1.6, color: 'var(--text-primary)'}}>
                     {call.transcript}
                   </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
