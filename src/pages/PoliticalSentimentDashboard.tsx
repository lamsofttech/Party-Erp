import React, { useEffect, useState } from 'react';
import { createJob, getAllJobs, getSentimentResults } from '../api';
import { NewJobPayload, ScrapingJob, SentimentResult } from '../types';
import JobCreationForm from '../components/forms/JobCreationForm';
import SentimentBarChart from '../components/charts/SentimentBarChart';

import SentimentTable from '../components/tables/SentimentTable';
import '../styles/global.css';

const PoliticalSentimentDashboard: React.FC = () => {
    const [jobs, setJobs] = useState<ScrapingJob[]>([]);
    const [selectedJobSentiments, setSelectedJobSentiments] = useState<SentimentResult[]>([]);
    const [selectedJob, setSelectedJob] = useState<ScrapingJob | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [sentimentLoading, setSentimentLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all scraping jobs when the component mounts
    useEffect(() => {
        fetchJobs();
    }, []);

    // Function to fetch all scraping jobs from the backend
    const fetchJobs = async () => {
        setError(null); // Clear any previous errors
        try {
            const fetchedJobs = await getAllJobs();
            setJobs(fetchedJobs);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load existing sentiment analysis jobs. Please check the backend connection.');
        }
    };

    // Handler for creating a new scraping job
    const handleCreateJob = async (jobData: NewJobPayload) => {
        setFormLoading(true); // Indicate that the form is being processed
        setError(null);
        try {
            const response = await createJob(jobData);
            alert(`New sentiment analysis job "${response.job_id}" created successfully! It will start processing in the background.`);
            fetchJobs(); // Refresh the list of jobs to show the new one
        } catch (err) {
            console.error('Error creating job:', err);
            setError('Failed to create sentiment analysis job. Please ensure all fields are correct and try again.');
        } finally {
            setFormLoading(false); // Reset loading state
        }
    };

    // Handler for selecting a job to view its sentiment results
    const handleJobSelect = async (job: ScrapingJob) => {
        setSelectedJob(job); // Set the selected job
        setSelectedJobSentiments([]); // Clear previous results
        setSentimentLoading(true); // Indicate loading of sentiment data
        setError(null);
        try {
            const sentiments = await getSentimentResults(job.job_id);
            setSelectedJobSentiments(sentiments);
        } catch (err) {
            console.error('Error fetching sentiment results:', err);
            setError(`Failed to load sentiment data for job "${job.job_name}". It might still be processing or an error occurred.`);
        } finally {
            setSentimentLoading(false); // Reset loading state
        }
    };

    // Optional: Auto-refresh job list periodically to see status updates
    useEffect(() => {
        const interval = setInterval(fetchJobs, 15000); // Refresh every 15 seconds
        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    return (
        <div className="dashboard-container">
            <h1>Political Sentiment Analysis Hub</h1>
            <p className="dashboard-description">
                Monitor and analyze public sentiment online regarding your political campaigns.
                Create new jobs to scrape data based on keywords and platforms, then view the sentiment distribution.
            </p>

            {/* Display error messages if any */}
            {error && <div className="error-message">{error}</div>}

            {/* Component for creating new jobs */}
            <JobCreationForm onSubmit={handleCreateJob} isLoading={formLoading} />

            <div className="job-list-section card">
                <h2>Current and Past Analysis Jobs</h2>
                {jobs.length === 0 ? (
                    <p>No sentiment analysis jobs found. Create your first job above to get started!</p>
                ) : (
                    <ul className="job-list">
                        {jobs.map((job) => (
                            <li key={job.job_id} className="job-list-item">
                                <span>
                                    <strong>Job Name: {job.job_name}</strong> (ID: {job.job_id})<br />
                                    <span className={`status-label status-${job.status}`}>Status: {job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                                    <br />
                                    Keywords: {job.keywords} | Platforms: {job.platforms}
                                    <br />
                                    Created: {new Date(job.created_at).toLocaleString()}
                                    {job.completed_at && job.status === 'completed' && ` | Completed: ${new Date(job.completed_at).toLocaleString()}`}
                                </span>
                                <button
                                    onClick={() => handleJobSelect(job)}
                                    // Enable button only if the job is completed and has sentiment data
                                    disabled={job.status !== 'completed'}
                                    className="view-button"
                                    title={job.status !== 'completed' ? 'Sentiment can only be viewed after the job is completed.' : 'View detailed sentiment results'}
                                >
                                    {selectedJob?.job_id === job.job_id ? 'Viewing' : 'View Sentiment'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Section to display sentiment results for the selected job */}
            {selectedJob && (
                <div className="sentiment-results-section card">
                    <h2>Sentiment Results for "{selectedJob.job_name}"</h2>
                    {sentimentLoading ? (
                        <p>Loading detailed sentiment results. Please wait...</p>
                    ) : selectedJobSentiments.length > 0 ? (
                        <>
                            <SentimentBarChart sentimentResults={selectedJobSentiments} />
                            <SentimentTable sentimentResults={selectedJobSentiments} />
                        </>
                    ) : (
                        <p>No sentiment data found for this job. It might still be processing, failed to gather data, or there's an issue with the analysis.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PoliticalSentimentDashboard;