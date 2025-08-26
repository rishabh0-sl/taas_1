import React, { useState } from 'react';
import './App.css';

interface GenerationForm {
  objective: string;
  url: string;
  credentials: {
    username: string;
    password: string;
  };
  runId: string;
}

interface GenerationResult {
  runId: string;
  outputs: Array<{
    id: string;
    name: string;
    description: string;
    steps: Array<{
      action: string;
      target: string;
      data?: any;
      description: string;
    }>;
  }>;
  metadata: {
    generatedAt: string;
    model: string;
    totalTime: number;
    source: string;
    mcpValidationSuccessful: boolean;
    stage: string;
    savedToFile: string;
    compilationResults: {
      successful: Array<{
        scenarioName: string;
        fileName: string;
        success: boolean;
      }>;
      failed: Array<{
        scenarioName: string;
        error: string;
        success: boolean;
      }>;
      totalScenarios: number;
      successfulCompilations: number;
      failedCompilations: number;
    };
  };
}

function App() {
  const [generationForm, setGenerationForm] = useState<GenerationForm>({
    objective: '',
    url: '',
    credentials: {
      username: '',
      password: ''
    },
    runId: ''
  });
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingState, setLoadingState] = useState<string>('');

  const handleGenerationInputChange = (field: keyof GenerationForm, value: any) => {
    if (field === 'credentials') {
      setGenerationForm(prev => ({
        ...prev,
        credentials: { ...prev.credentials, ...value }
      }));
    } else {
      setGenerationForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleGenerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setLoadingState('Generating test scenarios with AI...');
    
    try {
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setLoadingState('Compiling scenarios to Playwright tests...');
      
      const result = await response.json();
      setGenerationResult(result);
      
      setLoadingState('Generation and compilation completed successfully!');
      
      // Clear loading state after a short delay
      setTimeout(() => {
        setLoadingState('');
      }, 2000);
      
    } catch (error) {
      console.error('Error generating scenarios:', error);
      alert('Failed to generate scenarios. Please try again.');
      setLoadingState('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Prompt to Playwright Typescript</h1>
        <p>Generate Test Scenarios with LLM and Automatically Compile to Playwright</p>
      </header>

      <div className="generation-section">
        <h2>Generate Test Scenarios & Compile to Playwright</h2>
        <form onSubmit={handleGenerationSubmit} className="generation-form">
          <div className="form-group">
            <label htmlFor="objective">Test Objective:</label>
            <textarea
              id="objective"
              value={generationForm.objective}
              onChange={(e) => handleGenerationInputChange('objective', e.target.value)}
              placeholder="Describe what you want to test (e.g., 'Login functionality for Amazon website')"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="url">Target URL:</label>
            <input
              type="url"
              id="url"
              value={generationForm.url}
              onChange={(e) => handleGenerationInputChange('url', e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username (optional):</label>
            <input
              type="text"
              id="username"
              value={generationForm.credentials.username}
              onChange={(e) => handleGenerationInputChange('credentials', { username: e.target.value })}
              placeholder="testuser"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (optional):</label>
            <input
              type="password"
              id="password"
              value={generationForm.credentials.password}
              onChange={(e) => handleGenerationInputChange('credentials', { password: e.target.value })}
              placeholder="testpass"
            />
          </div>

          <div className="form-group">
            <label htmlFor="runId">Run ID (optional):</label>
            <input
              type="text"
              id="runId"
              value={generationForm.runId}
              onChange={(e) => handleGenerationInputChange('runId', e.target.value)}
              placeholder="run_123"
            />
          </div>

          <button type="submit" disabled={isGenerating} className="generate-btn">
            {isGenerating ? 'Processing...' : '🚀 Generate Scenarios & Compile to Playwright'}
          </button>
        </form>

        {/* Loading State Display */}
        {isGenerating && loadingState && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{loadingState}</p>
          </div>
        )}

        {generationResult && (
          <div className="generation-result">
            <h3>✅ Generation & Compilation Complete!</h3>
            
            {/* Compilation Results Summary */}
            <div className="compilation-summary">
              <h4>📁 Generated Files:</h4>
              <div className="file-list">
                {generationResult.metadata.compilationResults.successful.map((result, index) => (
                  <div key={index} className="file-item success">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{result.fileName}</span>
                    <span className="file-status">✅ Successfully compiled</span>
                  </div>
                ))}
                {generationResult.metadata.compilationResults.failed.map((result, index) => (
                  <div key={index} className="file-item error">
                    <span className="file-icon">❌</span>
                    <span className="file-name">{result.scenarioName}</span>
                    <span className="file-status">❌ Compilation failed: {result.error}</span>
                  </div>
                ))}
              </div>
              
              <div className="compilation-stats">
                <p><strong>Total Scenarios:</strong> {generationResult.metadata.compilationResults.totalScenarios}</p>
                <p><strong>Successfully Compiled:</strong> {generationResult.metadata.compilationResults.successfulCompilations}</p>
                {generationResult.metadata.compilationResults.failedCompilations > 0 && (
                  <p><strong>Failed Compilations:</strong> {generationResult.metadata.compilationResults.failedCompilations}</p>
                )}
                <p><strong>Files Saved To:</strong></p>
                <ul className="file-locations">
                  <li><code>📁 SL12 Results:</code> <code>apps/combined-api/results/</code></li>
                  <li><code>🧪 DEFLAKE Tests:</code> <code>packages/deflake/tests/</code></li>
                </ul>
              </div>
            </div>

            <div className="result-details">
              <p><strong>Run ID:</strong> {generationResult.runId}</p>
              <p><strong>Generated At:</strong> {new Date(generationResult.metadata.generatedAt).toLocaleString()}</p>
              <p><strong>Model:</strong> {generationResult.metadata.model}</p>
              <p><strong>Total Time:</strong> {generationResult.metadata.totalTime}ms</p>
              <p><strong>Source:</strong> {generationResult.metadata.source}</p>
            </div>
            
            <div className="scenarios-list">
              <h4>Generated Test Scenarios:</h4>
              {generationResult.outputs.map((output, index) => (
                <div key={index} className="scenario-item">
                  <h5>Scenario {index + 1}: {output.name}</h5>
                  <p><strong>ID:</strong> {output.id}</p>
                  <p><strong>Description:</strong> {output.description}</p>
                  <div className="steps-list">
                    <h6>Steps:</h6>
                    {output.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="step-item">
                        <span className="step-action">{step.action}</span>
                        <span className="step-target">{step.target}</span>
                        {step.data && <span className="step-data">Data: {JSON.stringify(step.data)}</span>}
                        <span className="step-description">{step.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="success-message">
              🎉 All scenarios have been generated and compiled to Playwright TypeScript files! 
              The .spec.ts files are automatically saved to both the SL12 results folder and the DEFLAKE tests folder.
            </div>
            
            {/* DEFLAKE Analysis Button */}
            <div className="deflake-navigation">
              <h4>🧪 Ready for Test Analysis?</h4>
              <p>Your Playwright tests have been generated! Now analyze them for flakiness and reliability using DEFLAKE.</p>
              <button 
                onClick={() => window.open('http://localhost:3001', '_blank')} 
                className="deflake-btn"
              >
                🚀 Open DEFLAKE Analysis Dashboard
              </button>
              <p className="deflake-info">
                <strong>DEFLAKE Features:</strong> Multi-browser testing, flakiness detection, 
                comprehensive reporting, and performance analysis
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
