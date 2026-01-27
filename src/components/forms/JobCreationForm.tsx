// src/components/forms/JobCreationForm.tsx
import React, { useState } from 'react';
import { NewJobPayload } from '../../types';


interface Props {
  onSubmit: (data: NewJobPayload) => Promise<void> | void;
  isLoading?: boolean;
}

const JobCreationForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [form, setForm] = useState<NewJobPayload>({
    job_name: '',
    keywords: '',
    platforms: '',
  });

  const update = (k: keyof NewJobPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm({ job_name: '', keywords: '', platforms: '' });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Create New Sentiment Job</h2>
      <div className="form-row">
        <label>Job name</label>
        <input value={form.job_name} onChange={update('job_name')} required />
      </div>
      <div className="form-row">
        <label>Keywords</label>
        <input value={form.keywords} onChange={update('keywords')} placeholder="candidate, party, issue" required />
      </div>
      <div className="form-row">
        <label>Platforms</label>
        <input value={form.platforms} onChange={update('platforms')} placeholder="twitter,news" required />
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating…' : 'Create Job'}
      </button>
    </form>
  );
};

export default JobCreationForm;
