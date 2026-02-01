interface BrowserSetupViewProps {
  progress: number;
  message?: string;
  error: string | null;
  onRetry?: () => void;
}

export function BrowserSetupView({
  progress,
  message,
  error,
  onRetry,
}: BrowserSetupViewProps) {
  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="logo-container">
          <div className="logo-circle">
            <span className="logo-text">P</span>
          </div>
        </div>

        <h1 className="setup-title">
          {error ? "Setup Failed" : "Initializing PRXY Auth"}
        </h1>
        <p className="setup-description">
          {error
            ? "We encountered an issue while setting up the browser components."
            : message ||
              "Setting up secure browser components for your sessions."}
        </p>

        {!error && (
          <div className="progress-wrapper">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-stats">
              <span className="progress-percentage">{progress}%</span>
              <span className="progress-status">
                {progress === 100 ? "Finalizing..." : "Downloading..."}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-message">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="error-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
            {onRetry && (
              <button className="retry-button" onClick={onRetry}>
                Retry Installation
              </button>
            )}
          </div>
        )}

        <div className="setup-footer">
          <p>
            Initial setup may take a few minutes depending on your connection.
          </p>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .setup-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f0f13;
          color: white;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .setup-card {
          width: 440px;
          padding: 40px;
          background: #1a1a20;
          border-radius: 24px;
          border: 1px solid #2a2a35;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .logo-container {
          margin-bottom: 24px;
        }
        .logo-circle {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }
        .logo-text {
          font-size: 32px;
          font-weight: 800;
          color: white;
        }
        .setup-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          background: linear-gradient(to right, #fff, #a1a1aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .setup-description {
          color: #a1a1aa;
          font-size: 15px;
          line-height: 1.5;
          margin-bottom: 32px;
        }
        .progress-wrapper {
          margin-bottom: 24px;
        }
        .progress-bar-container {
          height: 10px;
          background: #2a2a35;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
        }
        .progress-percentage {
          color: #3b82f6;
        }
        .progress-status {
          color: #a1a1aa;
        }
        .error-container {
          margin-bottom: 24px;
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .retry-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .retry-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .setup-footer {
          border-top: 1px solid #2a2a35;
          padding-top: 20px;
        }
        .setup-footer p {
          color: #71717a;
          font-size: 12px;
        }
      `,
        }}
      />
    </div>
  );
}
