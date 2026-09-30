import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface CrashInfo {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}

declare global {
  interface Window {
    crash: {
      getInfo(): Promise<CrashInfo | null>;
      exportAndRestart(): Promise<void>;
    };
  }
}

export function CrashApp() {
  const [crashInfo, setCrashInfo] = useState<CrashInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    window.crash.getInfo().then(setCrashInfo).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      await window.crash.exportAndRestart();
      setExported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f0f4',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#212121',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '760px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: '32px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 12px 0', color: '#111827' }}>
          Something went wrong
        </h1>
        <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontSize: '15px', lineHeight: 1.5 }}>
          ChronoChime encountered an unexpected error. Your data is safe locally.
        </p>
        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
          Export a crash report and restart the app to recover.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={handleExport}
            disabled={exporting || exported}
            style={{
              padding: '12px 20px',
              backgroundColor: exporting || exported ? '#f472b6' : '#EE5A8A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: exporting || exported ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {exporting ? 'Exporting…' : exported ? 'Export started' : 'Export Crash Report & Restart'}
          </button>
          <button
            onClick={() => window.close()}
            disabled={exporting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#4b5563',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {crashInfo && (
          <details style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}>
            <summary style={{ fontWeight: 500, cursor: 'pointer', color: '#374151', fontSize: '14px' }}>
              Technical details
            </summary>
            <div style={{ marginTop: '12px', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                {crashInfo.processType === 'main' ? 'Main process' : 'Renderer process'} crash
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '12px',
                backgroundColor: '#f3f4f6',
                padding: '12px',
                borderRadius: '6px',
                overflowX: 'auto',
                margin: 0,
                color: '#1f2937',
              }}>
                {crashInfo.message}
                {crashInfo.stack ? `\n\n${crashInfo.stack}` : ''}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<CrashApp />);
}
