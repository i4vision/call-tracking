import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { API_URL } from '../App';

export default function EditMetadataModal({ file, onClose, onSaved }) {
  const [newFilename, setNewFilename] = useState('');
  const [newNote, setNewNote] = useState('');
  const [historyNotes, setHistoryNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      setNewFilename(file.filename.replace('.mp3', ''));
      try {
         setHistoryNotes(file.notes ? JSON.parse(file.notes) : []);
      } catch(e) {
         setHistoryNotes(file.notes ? [{ id: 'legacy', date: new Date().toISOString(), text: file.notes }] : []);
      }
      setTags(file.tags || []);
      setNewTagInput('');
      setNewNote('');
    }
  }, [file]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const constructedName = newFilename.trim().endsWith('.mp3') 
        ? newFilename.trim() 
        : `${newFilename.trim()}.mp3`;

      const response = await fetch(`${API_URL}/files/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldFilename: file.filename,
          newFilename: constructedName,
          notes: newNote,
          tags: tags
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update metadata');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Edit Recording</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 0, 0, 0.1)', color: '#ff6b6b', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Filename</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="text" 
              value={newFilename} 
              onChange={(e) => setNewFilename(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, cursor: 'text', fontFamily: 'inherit' }}
            />
             <span style={{ color: 'var(--text-secondary)' }}>.mp3</span>
          </div>
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Custom Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {tags.map(tag => (
              <span key={tag} style={{ background: 'rgba(0, 150, 255, 0.2)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {tag} <X size={12} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setTags(tags.filter(t => t !== tag))} />
              </span>
            ))}
            {tags.length === 0 && <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>No tags attached.</span>}
          </div>
          <input 
            type="text" 
            value={newTagInput} 
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTagInput.trim()) {
                e.preventDefault();
                const processed = newTagInput.trim().toLowerCase();
                if (!tags.includes(processed)) setTags([...tags, processed]);
                setNewTagInput('');
              }
            }}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, cursor: 'text', fontFamily: 'inherit', fontSize: '0.85rem' }}
            placeholder="Type a custom tag and hit Enter..."
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Annotation History</label>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 15, paddingRight: 5 }}>
            {historyNotes.length === 0 ? (
               <div style={{ padding: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px dashed var(--border-color)' }}>
                 No historical mapping logs attached.
               </div>
            ) : (
               historyNotes.map((note) => (
                 <div key={note.id || note.date} style={{ padding: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, marginBottom: 8 }}>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                     <span>Logged explicitly on</span>
                     <span>{new Date(note.date).toLocaleString()}</span>
                   </div>
                   <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                     {note.text}
                   </div>
                 </div>
               ))
            )}
          </div>

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Add New Note (Optional)</label>
          <textarea 
            value={newNote} 
            onChange={(e) => setNewNote(e.target.value)}
            style={{ width: '100%', minHeight: '80px', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Write a new annotation strictly mapping to this physical audio track..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-color-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={isSaving || !newFilename.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 4, cursor: 'pointer', border: 'none', background: 'var(--accent-color)', color: '#fff' }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Updates'}
          </button>
        </div>
      </div>
    </div>
  );
}
