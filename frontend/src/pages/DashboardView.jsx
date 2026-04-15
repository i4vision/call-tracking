import React, { useState, useEffect } from 'react';
import { Activity, Smile, Frown, Meh, AlertTriangle, Zap, CheckCircle, BarChart } from 'lucide-react';
import { API_URL } from '../App';

export default function DashboardView() {
  const [stats, setStats] = useState({});
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

  // Icon and Style mapper for the generic emotions
  const EMOTION_META = {
    delighted: { icon: Smile, color: 'var(--success-color)' },
    satisfied: { icon: CheckCircle, color: '#3fb950' },
    neutral: { icon: Meh, color: 'var(--text-secondary)' },
    confused: { icon: Zap, color: 'var(--accent-color)' },
    frustrated: { icon: AlertTriangle, color: 'orange' },
    angry: { icon: Frown, color: 'var(--danger-color)' },
    urgent: { icon: AlertTriangle, color: '#ff2c00' },
  };

  const getMeta = (emotionKey) => EMOTION_META[emotionKey.toLowerCase()] || { icon: BarChart, color: 'var(--text-secondary)' };

  return (
    <>
      <div className="topbar">
         <div style={{fontWeight: 500, color: 'var(--text-secondary)'}}>Analytics & Sentiment</div>
      </div>
      
      <div className="content-header">
        <h1>Emotions Dashboard</h1>
        <p>Dynamic overview of caller sentiment explicitly categorized by AI analysis.</p>
      </div>

      {loading ? (
        <div style={{padding: 40, color: 'var(--text-secondary)'}}>Loading analytics...</div>
      ) : (
        <>
          <div className="stats-grid">
            {Object.keys(stats).length === 0 ? (
               <div style={{color: 'var(--text-secondary)'}}>No emotions logged yet. Transcribe some calls!</div>
            ) : null}
            {Object.entries(stats).sort((a,b) => b[1] - a[1]).map(([emotion, count]) => {
              const meta = getMeta(emotion);
              const SIcon = meta.icon;
              return (
                <div className="stat-card" key={emotion}>
                  <div className="stat-icon" style={{background: `${meta.color}22`, color: meta.color}}>
                    <SIcon size={32} />
                  </div>
                  <div className="stat-info">
                    <h3 style={{textTransform: 'capitalize'}}>{emotion}</h3>
                    <div className="value" style={{color: meta.color}}>{count}</div>
                  </div>
                </div>
              );
            })}
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
                    {recent.map(call => {
                      const cColor = getMeta(call.emotion).color;
                      return (
                        <tr key={call.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                          <td style={{padding: '15px 20px'}}>{call.filename}</td>
                          <td style={{padding: '15px 20px'}}><span className="badge badge-ai" style={{background: 'rgba(255,255,255,0.05)', color: '#8b949e', border: '1px solid #30363d'}}>{call.ai_version.replace(' | ', ' ⚙️ ')}</span></td>
                          <td style={{padding: '15px 20px'}}><span className={`badge`} style={{background: `${cColor}15`, color: cColor, border: `1px solid ${cColor}40`}}>{call.emotion.toUpperCase()}</span></td>
                          <td style={{padding: '15px 20px', color: 'var(--success-color)'}}>${Number(call.cost || 0).toFixed(4)}</td>
                          <td style={{padding: '15px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{new Date(call.created_at).toLocaleString()}</td>
                        </tr>
                      )
                    })}
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
