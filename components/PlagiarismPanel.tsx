'use client';

import { PlagiarismResult } from '@/types';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  result: PlagiarismResult;
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const color =
    score < 15 ? '#4aad7a' :
    score < 35 ? '#d4a847' :
    '#d85555';

  const label =
    score < 15 ? 'Original' :
    score < 35 ? 'Moderate' :
    'High Risk';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#252d3d" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="45" y="40" textAnchor="middle" fontSize="18" fontWeight="700" fill={color} fontFamily="DM Mono, monospace">
          {score}%
        </text>
        <text x="45" y="55" textAnchor="middle" fontSize="9" fill="#a8a098" fontFamily="DM Sans, sans-serif">
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function PlagiarismPanel({ result }: Props) {
  const isClean = result.score < 15;

  return (
    <div className="rounded-lg border border-[#252d3d] bg-[#0f1219] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#252d3d] bg-[#0f1219]/50">
        {isClean ? (
          <ShieldCheck size={14} className="text-[#4aad7a]" />
        ) : (
          <ShieldAlert size={14} className="text-[#d4a847]" />
        )}
        <span className="text-xs font-semibold text-[#a8a098] uppercase tracking-wider">
          Originality Check
        </span>
        {result.isChecking && (
          <span className="text-xs text-[#d4a847] ml-auto animate-pulse font-medium">Analyzing…</span>
        )}
      </div>

      <div className="p-4">
        {result.isChecking ? (
          <div className="flex items-center justify-center py-6">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#d4a847] loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-5 items-start">
            <ScoreGauge score={result.score} />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Suggestions */}
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Lightbulb size={12} className="text-[#d4a847] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#a8a098] leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches */}
        {!result.isChecking && result.matches.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-[#252d3d] pt-4">
            <p className="text-xs text-[#6b6460] uppercase tracking-wider font-medium">Flagged Sections</p>
            {result.matches.slice(0, 3).map((match, i) => (
              <div key={i} className="rounded-lg border border-[#5a3030] bg-[#1a0f0f] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#d85555] truncate max-w-[140px] font-medium flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {match.source}
                  </span>
                  <span className="text-xs font-mono-custom text-[#d85555]">
                    {Math.round(match.similarityScore)}% match
                  </span>
                </div>
                <p className="text-xs text-[#a8a098] italic leading-relaxed">
                  "…{match.matchedText.slice(0, 80)}…"
                </p>
                <p className="text-xs text-[#6b6460] mt-2 leading-relaxed">{match.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
