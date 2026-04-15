import React, { useState, useEffect } from 'react';
import { Activity, Smile, Frown, Meh, BarChart } from 'lucide-react';
import { API_URL } from '../App';

export default function DashboardView() {
  const [stats, setStats] = useState({ good: 0, bad: 0, neutral: 0, total: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(res => res.json())
      .then(data => {
        if (data.stats) setStats(data.stats);
        if (data.recentCalls) setRecent(data.recentCalls);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard', err);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <div className="topbar">
         <div style={{fontWeight: 500, color: 'var(--text-secondary)'}}>Analytics & Sentiment</div>
      </div>
      
      <div className="content-header">
        <h1>Emotions Dashboard</h1>
        <p>High-level overview of caller sentiment based on transcription intelligence.</p>
      </div>

      {loading ? (
        <div style={{padding: 40, color: 'var(--text-secondary)'}}>Loading analytics...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon good"><Smile size={32} /></div>
              <div className="stat-info">
                <h3>Good Calls</h3>
                <div className="value" style={{color: 'var(--success-color)'}}>{stats.good}</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon bad"><Frown size={32} /></div>
              <div className="stat-info">
                <h3>Bad Calls</h3>
                <div className="value" style={{color: 'var(--danger-color)'}}>{stats.bad}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon neutral"><Meh size={32} /></div>
              <div className="stat-info">
                <h3>Neutral Calls</h3>
                <div className="value" style={{color: 'var(--text-secondary)'}}>{stats.neutral}</div>
              </div>
            </div>
          </div>

          <div style={{padding: '0 40px 40px'}}>
            <h2 style={{fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10}}>
              <Activity size={20} color="var(--accent-color)" /> Recent Processed Calls
            </h2>
            <div style={{background: 'var(--bg-color-secondary)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden'}}>
              {recent.length === 0 ? (
                <div style={{padding: 20, color: 'var(--text-secondary)', textAlign: 'center'}}>No calls processed yet.</div>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                  <thead>
                    <tr style={{background: 'var(--bg-color-tertiary)', borderBottom: '1px solid var(--border-color)'}}>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Filename</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Model</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Emotion</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Cost</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(call => (
                      <tr key={call.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                        <td style={{padding: '15px 20px'}}>{call.filename}</td>
                        <td style={{padding: '15px 20px'}}><span className="badge badge-ai" style={{background: 'rgba(255,255,255,0.05)', color: '#8b949e', border: '1px solid #30363d'}}>{call.ai_version.replace(' | ', ' ⚙️ ')}</span></td>
                        <td style={{padding: '15px 20px'}}><span className={`badge badge-${call.emotion}`}>{call.emotion}</span></td>
                        <td style={{padding: '15px 20px', color: 'var(--success-color)'}}>${Number(call.cost || 0).toFixed(4)}</td>
                        <td style={{padding: '15px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{new Date(call.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
