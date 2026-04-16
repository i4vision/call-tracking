import React, { useEffect, useState } from 'react';
import { X, Mic, Layers, Clock, Activity, FileText, Timer, Play, Pause } from 'lucide-react';
import { API_URL } from '../App';

export default function FileHistoryModal({ filename, onClose, playingFile, togglePlay, audioRef }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Syncing with external audio object
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    // Explicit sync grab if it's already playing
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef]);

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
        
        <div style={{padding: '20px 30px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color-tertiary)', display: 'flex', alignItems: 'center', gap: 15}}>
           <button 
             onClick={() => togglePlay(null, filename)} 
             className={`play-btn ${playingFile === filename ? 'active' : ''}`}
             style={{background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 45, height: 45, padding: 0}}
           >
             {playingFile === filename ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
           </button>
           <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
             <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'monospace'}}>
               <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
               <span>{isNaN(duration) ? '0:00' : `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`}</span>
             </div>
             <input 
               type="range" 
               className="audio-scrubber"
               min={0} 
               max={duration || 100} 
               value={currentTime} 
               onChange={(e) => {
                 if (audioRef.current) {
                   audioRef.current.currentTime = parseFloat(e.target.value);
                   setCurrentTime(parseFloat(e.target.value));
                 }
               }}
               style={{width: '100%'}}
             />
           </div>
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

                <div style={{display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20}}>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Audio: <span style={{color: 'var(--success-color)', fontWeight: 600}}>${Number(call.cost_transcribe || 0).toFixed(4)}</span>
                   </span>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Brain: <span style={{color: 'var(--accent-color)', fontWeight: 600}}>${Number(call.cost_analyze || 0).toFixed(4)}</span>
                   </span>
                   <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                     Time: <span style={{color: 'var(--text-primary)', fontWeight: 600}}>{Number(call.processing_time || 0).toFixed(1)}s</span>
                   </span>
                </div>

                <div style={{display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 20}}>
                  <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}>Processing Unit</div>
                    <div style={{color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'monospace'}}>{call.ai_version.replace(' | ', ' ⚙️ ')}</div>
                  </div>
                  <div style={{background: 'var(--bg-color-tertiary)', padding: '10px 15px', borderRadius: 8, flex: 1, border: '1px solid var(--border-color)'}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5}}><Timer size={12}/> Audio Len</div>
                    <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem'}}>{call.audio_duration ? `${Math.floor(Number(call.audio_duration) / 60)}m ${Math.round(Number(call.audio_duration) % 60)}s` : 'Unknown'}</div>
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
