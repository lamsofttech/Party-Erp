// src/components/tables/SentimentTable.tsx
import React from 'react';
import { SentimentResult } from '../../types';


interface Props {
  sentimentResults: SentimentResult[];
}

const SentimentTable: React.FC<Props> = ({ sentimentResults }) => {
  return (
    <div className="card">
      <h3>Raw Sentiment Data</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Sentiment</th>
            <th>Score</th>
            <th>Text</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {sentimentResults.map((r) => (
            <tr key={r.id}>
              <td>{r.source}</td>
              <td className={`pill pill-${r.sentiment}`}>{r.sentiment}</td>
              <td>{r.score}</td>
              <td style={{ maxWidth: 520, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {r.text}
              </td>
              <td>{r.published_at ? new Date(r.published_at).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SentimentTable;
