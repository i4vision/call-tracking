import React from 'react';
import { X, Mic, FileText, Database, Activity, Clock } from 'lucide-react';

export default function CallDetailsModal({ call, onClose }) {
  if (!call) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{maxWidth: 700}} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2><Mic size={20} color="var(--accent-color)" style={{marginRight: 8}} /> Call Overview</h2>
          <p style={{fontFamily: 'monospace'}}>{call.filename}</p>
        </div>
        
        <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: 20}}>
          
          <div style={{display: 'flex', gap: 15, flexWrap: 'wrap'}}>
            <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}><Database size={12}/> Processing Cost</div>
              <div style={{color: 'var(--success-color)', fontWeight: 600}}>${Number(call.cost).toFixed(4)}</div>
            </div>
            <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}><Clock size={12}/> Time Taken</div>
              <div style={{color: 'var(--text-primary)', fontWeight: 600}}>{Number(call.processing_time).toFixed(1)}s</div>
            </div>
            <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}><Activity size={12}/> Sentiment</div>
              <div style={{fontWeight: 600, textTransform: 'capitalize'}}>{call.emotion}</div>
            </div>
          </div>

          <div>
             <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8}}>AI Engines Utilized</div>
             <div style={{padding: '10px 15px', background: 'var(--bg-color)', borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.85rem'}}>
               {call.ai_version.replace(' | ', ' ⚙️ ')}
             </div>
          </div>

          <div>
             <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5}}><FileText size={14}/> Extracted Transcript</div>
             <div style={{padding: 20, background: 'var(--bg-color-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', maxHeight: 300, overflowY: 'auto', lineHeight: 1.6, color: 'var(--text-primary)'}}>
               {call.transcript}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
