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
    score < 15 ? '#4a9060' :
    score < 35 ? '#c8962a' :
    '#d04040';

  const label =
    score < 15 ? 'Original' :
    score < 35 ? 'Moderate' :
    'High Risk';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#e5dfd6" strokeWidth="6" />
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
        <text x="45" y="55" textAnchor="middle" fontSize="9" fill="#a39a91" fontFamily="DM Sans, sans-serif">
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function PlagiarismPanel({ result }: Props) {
  const isClean = result.score < 15;

  return (
    <div className="rounded-lg border border-[#e5dfd6] bg-[#f3f1ed] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5dfd6]">
        {isClean ? (
          <ShieldCheck size={13} className="text-[#4a9060]" />
        ) : (
          <ShieldAlert size={13} className="text-[#c8962a]" />
        )}
        <span className="text-xs font-medium text-[#6b6460] uppercase tracking-wider">
          Originality Check
        </span>
        {result.isChecking && (
          <span className="text-xs text-[#c8962a] ml-auto animate-pulse">Analyzing…</span>
        )}
      </div>

      <div className="p-3">
        {result.isChecking ? (
          <div className="flex items-center justify-center py-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8962a] loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            <ScoreGauge score={result.score} />

            <div className="flex-1 min-w-0 space-y-2">
              {/* Suggestions */}
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Lightbulb size={11} className="text-[#c8962a] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#6b6460] leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches */}
        {!result.isChecking && result.matches.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[#a39a91] uppercase tracking-wider">Flagged Sections</p>
            {result.matches.slice(0, 3).map((match, i) => (
              <div key={i} className="rounded border border-[#e5c9c9] bg-[#f8eded] p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#d04040] truncate max-w-[140px]">
                    <AlertTriangle size={10} className="inline mr-1" />
                    {match.source}
                  </span>
                  <span className="text-xs font-mono-custom text-[#d04040]">
                    {Math.round(match.similarityScore)}% match
                  </span>
                </div>
                <p className="text-xs text-[#6b6460] italic leading-relaxed">
                  "…{match.matchedText.slice(0, 80)}…"
                </p>
                <p className="text-xs text-[#a39a91] mt-1 leading-relaxed">{match.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
