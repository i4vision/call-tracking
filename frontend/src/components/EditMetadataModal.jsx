import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { API_URL } from '../App';

export default function EditMetadataModal({ file, onClose, onSaved }) {
  const [newFilename, setNewFilename] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      setNewFilename(file.filename.replace('.mp3', ''));
      setNotes(file.notes || '');
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
          notes: notes
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Annotations / Notes</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', minHeight: '120px', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Add specific context, customer flags, or behavioral markers here..."
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
