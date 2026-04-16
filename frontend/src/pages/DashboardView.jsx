import React, { useState, useEffect } from 'react';
import { Activity, Smile, Frown, Meh, AlertTriangle, Zap, CheckCircle, BarChart, ChevronRight, ChevronDown } from 'lucide-react';
import { API_URL } from '../App';
import CallDetailsModal from '../components/CallDetailsModal';

export default function DashboardView() {
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

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
              const isSelected = filter === emotion;
              return (
                <div 
                  className="stat-card" 
                  key={emotion}
                  onClick={() => setFilter(isSelected ? null : emotion)}
                  style={{
                    cursor: 'pointer', 
                    border: isSelected ? `1px solid ${meta.color}` : undefined,
                    boxShadow: isSelected ? `0 0 10px ${meta.color}33` : undefined,
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'var(--transition)'
                  }}
                >
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
            <h2 style={{fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <span style={{display: 'flex', alignItems: 'center', gap: 10}}><Activity size={20} color="var(--accent-color)" /> Recent Processed Calls {filter && <span style={{fontSize: '0.9rem', padding: '2px 8px', background: 'var(--bg-color-tertiary)', borderRadius: 12, color: 'var(--text-secondary)'}}>Filtered: {filter}</span>}</span>
              {filter && <button onClick={() => setFilter(null)} style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem'}}>Clear Filter</button>}
            </h2>
            <div style={{background: 'var(--bg-color-secondary)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden'}}>
              {recent.length === 0 ? (
                <div style={{padding: 20, color: 'var(--text-secondary)', textAlign: 'center'}}>No calls processed yet.</div>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                  <thead>
                    <tr style={{background: 'var(--bg-color-tertiary)', borderBottom: '1px solid var(--border-color)'}}>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Filename</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Date</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Models</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Audio Cost</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>AI Cost</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Time (sec)</th>
                      <th style={{padding: '15px 20px', color: 'var(--text-secondary)', fontWeight: 500}}>Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredCalls = recent.filter(c => !filter || c.emotion === filter);
                      const groupsMap = new Map();
                      filteredCalls.forEach(call => {
                        if (!groupsMap.has(call.filename)) groupsMap.set(call.filename, []);
                        groupsMap.get(call.filename).push(call);
                      });
                      const groupedCallsArray = Array.from(groupsMap.values());

                      const toggleRow = (filename, e) => {
                        if (e) e.stopPropagation();
                        const next = new Set(expandedRows);
                        if (next.has(filename)) next.delete(filename);
                        else next.add(filename);
                        setExpandedRows(next);
                      };

                      return groupedCallsArray.map((group, idx) => {
                        const parentCall = group[0];
                        const hasChildren = group.length > 1;
                        const isExpanded = expandedRows.has(parentCall.filename);
                        const cColor = getMeta(parentCall.emotion).color;

                        return (
                          <React.Fragment key={`group-${idx}`}>
                            <tr 
                              className="dashboard-row" 
                              style={{borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s', background: isExpanded ? 'var(--bg-color-secondary)' : 'transparent'}} 
                              onClick={() => setSelectedCall(parentCall)}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color-tertiary)'} 
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = isExpanded ? 'var(--bg-color-secondary)' : 'transparent'}
                            >
                              <td style={{padding: '15px 20px', fontFamily: 'monospace', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8}}>
                                {hasChildren && (
                                  <button onClick={(e) => toggleRow(parentCall.filename, e)} style={{background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px'}}>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </button>
                                )}
                                {!hasChildren && <div style={{width: 24}}></div>}
                                <span>{parentCall.filename}</span>
                                {hasChildren && <span style={{fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: 'var(--text-secondary)', marginLeft: 8}}>{group.length} Transcripts</span>}
                              </td>
                              <td style={{padding: '15px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{new Date(parentCall.created_at).toLocaleString()}</td>
                              <td style={{padding: '15px 20px'}}><span className="badge badge-ai" style={{background: 'rgba(255,255,255,0.05)', color: '#8b949e', border: '1px solid #30363d'}}>{parentCall.ai_version.replace(' | ', ' ⚙️ ')}</span></td>
                              <td style={{padding: '15px 20px', color: 'var(--success-color)'}}>${Number(parentCall.cost_transcribe || 0).toFixed(4)}</td>
                              <td style={{padding: '15px 20px', color: 'var(--accent-color)'}}>${Number(parentCall.cost_analyze || 0).toFixed(4)}</td>
                              <td style={{padding: '15px 20px', color: 'var(--text-primary)'}}>{Number(parentCall.processing_time || 0).toFixed(1)}s</td>
                              <td style={{padding: '15px 20px'}}><span className={`badge`} style={{background: `${cColor}15`, color: cColor, border: `1px solid ${cColor}40`}}>{parentCall.emotion.toUpperCase()}</span></td>
                            </tr>
                            
                            {isExpanded && group.slice(1).map((childCall, childIdx) => {
                              const childColor = getMeta(childCall.emotion).color;
                              return (
                                <tr 
                                  key={`child-${idx}-${childIdx}`} 
                                  style={{background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer'}} 
                                  onClick={() => setSelectedCall(childCall)}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color-tertiary)'} 
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                >
                                  <td style={{padding: '12px 20px', paddingLeft: 55, fontFamily: 'monospace', fontSize: '0.8rem'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)'}}>
                                      ↳ Version {group.length - childIdx}
                                    </div>
                                  </td>
                                  <td style={{padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{new Date(childCall.created_at).toLocaleString()}</td>
                                  <td style={{padding: '12px 20px'}}><span className="badge badge-ai" style={{background: 'rgba(255,255,255,0.02)', color: '#8b949e', border: '1px solid #30363d', fontSize: '0.7rem'}}>{childCall.ai_version.replace(' | ', ' ⚙️ ')}</span></td>
                                  <td style={{padding: '12px 20px', color: 'var(--success-color)'}}>${Number(childCall.cost_transcribe || 0).toFixed(4)}</td>
                                  <td style={{padding: '12px 20px', color: 'var(--accent-color)'}}>${Number(childCall.cost_analyze || 0).toFixed(4)}</td>
                                  <td style={{padding: '12px 20px', color: 'var(--text-primary)'}}>{Number(childCall.processing_time || 0).toFixed(1)}s</td>
                                  <td style={{padding: '12px 20px'}}><span className={`badge`} style={{background: `${childColor}15`, color: childColor, border: `1px solid ${childColor}40`, fontSize: '0.7rem'}}>{childCall.emotion.toUpperCase()}</span></td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <CallDetailsModal call={selectedCall} onClose={() => setSelectedCall(null)} />
        </>
      )}
    </>
  );
}
