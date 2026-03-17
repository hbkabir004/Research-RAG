'use client';
import { PlagiarismResult } from '@/types';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lightbulb } from 'lucide-react';

function ScoreGauge({ score }: { score: number }) {
  const r = 32, circ = 2*Math.PI*r;
  const offset = circ - (score/100)*circ;
  const color = score < 15 ? 'var(--green-400)' : score < 35 ? 'var(--amber-400)' : 'var(--red-400)';
  const label = score < 15 ? 'Original' : score < 35 ? 'Moderate' : 'High Risk';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={r} fill="none" stroke="var(--border-1)" strokeWidth={6} />
        <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition:'stroke-dashoffset 0.7s ease' }} />
        <text x={40} y={37} textAnchor="middle" fontSize={16} fontWeight={700} fill={color} fontFamily="JetBrains Mono,monospace">{score}%</text>
        <text x={40} y={51} textAnchor="middle" fontSize={9} fill="var(--text-3)" fontFamily="DM Sans,sans-serif">{label}</text>
      </svg>
    </div>
  );
}

export default function PlagiarismPanel({ result }: { result: PlagiarismResult }) {
  return (
    <div className="plag-panel">
      <div className="plag-header">
        {result.score < 15 ? <ShieldCheck size={13} color="var(--green-400)" /> : <ShieldAlert size={13} color="var(--amber-400)" />}
        <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)' }}>Originality Check</span>
        {result.isChecking && <span style={{ fontSize:11, color:'var(--amber-400)', marginLeft:'auto', animation:'pulse 1.5s infinite' }}>Analyzing…</span>}
      </div>

      <div style={{ padding:14 }}>
        {result.isChecking ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'16px 0', gap:6 }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <ScoreGauge score={result.score} />
              <div style={{ flex:1, minWidth:0 }}>
                {result.suggestions.map((s,i) => (
                  <div key={i} style={{ display:'flex', gap:7, marginBottom:8 }}>
                    <Lightbulb size={12} color="var(--amber-500)" style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {result.matches.length > 0 && (
              <div style={{ marginTop:12 }}>
                <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-4)', marginBottom:8 }}>Flagged Sections</p>
                {result.matches.slice(0,3).map((m,i) => (
                  <div key={i} style={{ padding:'10px 12px', background:'rgba(224,80,80,0.06)', border:'1px solid rgba(224,80,80,0.18)', borderRadius:8, marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:11.5, color:'var(--red-400)', display:'flex', alignItems:'center', gap:4 }}>
                        <AlertTriangle size={10} />{m.source.length > 24 ? m.source.slice(0,24)+'…' : m.source}
                      </span>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--red-400)' }}>{Math.round(m.similarityScore)}%</span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic', lineHeight:1.5, marginBottom:4 }}>"{m.matchedText.slice(0,80)}…"</p>
                    <p style={{ fontSize:11.5, color:'var(--text-4)', lineHeight:1.5 }}>{m.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
