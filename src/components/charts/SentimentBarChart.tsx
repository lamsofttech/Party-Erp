// src/components/charts/SentimentBarChart.tsx
import React, { useMemo } from 'react';
import { SentimentResult } from '../../types';

// Minimal, no extra deps. Replace with Recharts later if you want.
interface Props {
  sentimentResults: SentimentResult[];
}

const SentimentBarChart: React.FC<Props> = ({ sentimentResults }) => {
  const counts = useMemo(() => {
    const base = { positive: 0, neutral: 0, negative: 0 };
    for (const r of sentimentResults) base[r.sentiment]++;
    return base;
  }, [sentimentResults]);

  const total = counts.positive + counts.neutral + counts.negative || 1;

  return (
    <div className="card">
      <h3>Sentiment Distribution</h3>
      <div className="bar-chart" style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${(counts.positive / total) * 100}%` }} className="bar bar-positive" />
        <div style={{ width: `${(counts.neutral / total) * 100}%` }} className="bar bar-neutral" />
        <div style={{ width: `${(counts.negative / total) * 100}%` }} className="bar bar-negative" />
      </div>
      <div className="legend" style={{ marginTop: 8, display: 'flex', gap: 16 }}>
        <span>👍 {counts.positive}</span>
        <span>😐 {counts.neutral}</span>
        <span>👎 {counts.negative}</span>
      </div>
    </div>
  );
};

export default SentimentBarChart;
