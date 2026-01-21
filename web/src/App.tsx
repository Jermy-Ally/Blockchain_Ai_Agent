import { useState, useEffect } from 'react';
import './App.css';

interface AgentStatus {
  id: string;
  name: string;
  network: string;
  isRunning: boolean;
  services: any[];
  earnings: {
    total: number;
    available: number;
    reinvested: number;
    byService: Record<string, number>;
  };
  subAgents: any[];
  balance?: number;
}

interface Service {
  id: string;
  name: string;
  type: string;
  price: number;
  enabled: boolean;
}

function App() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceParams, setServiceParams] = useState<Record<string, any>>({});
  const [serviceResult, setServiceResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'earnings' | 'subagents'>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Force console to be available
  if (typeof console === 'undefined') {
    (window as any).console = { log: () => {}, error: () => {}, warn: () => {} };
  }
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    // Always log to console
    try {
      console.log(logMessage);
    } catch (e) {
      // Fallback if console is blocked
    }
    // Also add to visible logs
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
  };

  const getApiBase = () => {
    // Prefer explicit env var; fall back to localhost only in dev
    const raw = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');
    return raw.replace(/\/$/, '');
  };

  useEffect(() => {
    // Log initial connection attempt
    const apiBase = getApiBase();
    addDebugLog('App mounted, attempting to fetch status...');
    addDebugLog(`Backend URL: ${apiBase || '(not set)'}`);
    addDebugLog(`Current URL: ${window.location.href}`);
    
    const fetch = async () => {
      await fetchStatus();
    };
    fetch();
    
    const interval = setInterval(() => {
      addDebugLog('Auto-refreshing status...');
      fetchStatus();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = async () => {
    setError(null);
    setConnectionStatus('Connecting...');
    
    addDebugLog('=== Starting fetchStatus ===');
    
    const apiBase = getApiBase();
    if (!apiBase) {
      const msg = 'VITE_API_URL is not set; cannot reach backend in production.';
      addDebugLog(`❌ ${msg}`);
      setError(msg);
      setConnectionStatus('❌ Connection failed');
      setLoading(false);
      return;
    }

    try {
      const url = `${apiBase}/status`;
      addDebugLog(`Attempt: GET ${url}`);
      setConnectionStatus(`Connecting: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning page
        },
      });
      
      addDebugLog(`Response: ${response.status} ${response.statusText}`);
      addDebugLog(`Content-Type: ${response.headers.get('content-type')}`);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        addDebugLog(`❌ Received ${contentType} instead of JSON`);
        addDebugLog(`Response preview: ${text.substring(0, 200)}`);
        throw new Error(`Backend returned HTML instead of JSON. Check if ngrok is showing a warning page or backend is not running.`);
      }
      
      if (!response.ok) {
        const text = await response.text();
        addDebugLog(`❌ Error body: ${text.substring(0, 200)}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      addDebugLog('✅ Success! Data received');
      setStatus(data);
      setLoading(false);
      setConnectionStatus('✅ Connected');
      setError(null);
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Fetch failed: ${errorMsg}`);
      setError(errorMsg);
      setConnectionStatus('❌ Connection failed');
      setLoading(false);
    }
  };

  const handleServiceRequest = async () => {
    if (!selectedService || isSubmitting) return;

    setIsSubmitting(true);
    setServiceResult(null); // Clear previous result

    try {
      const apiBase = getApiBase();
      if (!apiBase) {
        throw new Error('VITE_API_URL is not set; cannot reach backend.');
      }
      const response = await fetch(`${apiBase}/service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning page
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          userId: 'user_' + Date.now(),
          params: serviceParams,
          paymentAmount: selectedService.price,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setServiceResult(result);
      
      // Refresh status after service request to update balance and earnings
      // Wait a bit for on-chain transactions to be confirmed
      setTimeout(() => {
        fetchStatus();
      }, result.paymentMode === 'onchain' ? 3000 : 500);
    } catch (error) {
      console.error('Error requesting service:', error);
      alert(`Failed to request service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderServiceResult = (result: any) => {
    if (!result) return null;

    // Market Analysis Result
    if (result.serviceId === 'market-analysis' && result.result) {
      const data = result.result;
      
      // Check if this is a multi-token overview (has topGainers, topLosers, etc.)
      const isMultiToken = data.topGainers || data.topLosers || data.highestVolume;
      
      return (
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Transaction Hash</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all' }}>
                {result.transactionHash}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>Payment Mode</p>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: result.paymentMode === 'onchain' ? '#dbeafe' : '#f3f4f6',
                color: result.paymentMode === 'onchain' ? '#1e40af' : '#4b5563',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {result.paymentMode || 'simulated'}
              </span>
            </div>
          </div>

          {isMultiToken ? (
            // Multi-token overview display
            <div>
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Multi-Token Market Overview</h5>
              
              {data.topGainers && data.topGainers.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#059669' }}>Top Gainers (24h)</h6>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {data.topGainers.slice(0, 5).map((token: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all' }}>
                              {token.token.substring(0, 20)}...
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                              ${token.price?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#059669' }}>
                              +{token.priceChange24h?.toFixed(2) || '0.00'}%
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                              Vol: ${token.volume24h?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.topLosers && data.topLosers.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#dc2626' }}>Top Losers (24h)</h6>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {data.topLosers.slice(0, 5).map((token: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all' }}>
                              {token.token.substring(0, 20)}...
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                              ${token.price?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#dc2626' }}>
                              {token.priceChange24h?.toFixed(2) || '0.00'}%
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                              Vol: ${token.volume24h?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.highestVolume && data.highestVolume.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#2563eb' }}>Highest Volume (24h)</h6>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {data.highestVolume.slice(0, 5).map((token: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all' }}>
                              {token.token.substring(0, 20)}...
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                              ${token.price?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#2563eb' }}>
                              ${token.volume24h?.toLocaleString() || '0'}
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h?.toFixed(2) || '0.00'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Single token analysis display
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Token Analysis</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Price (USD)</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                    ${data.price?.toFixed(4) || '0.0000'}
                  </p>
                </div>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>24h Change</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: (data.priceChange24h || 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {(data.priceChange24h || 0) >= 0 ? '+' : ''}{data.priceChange24h?.toFixed(2) || '0.00'}%
                  </p>
                </div>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>24h Volume</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                    ${data.volume24h?.toLocaleString() || '0'}
                  </p>
                </div>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Liquidity</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                    ${data.liquidity?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.signals && data.signals.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#92400e' }}>AI Trading Signal</h5>
              {data.signals.map((signal: any, idx: number) => (
                <div key={idx} style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '6px', marginBottom: idx < data.signals.length - 1 ? '0.5rem' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: signal.action === 'buy' ? '#d1fae5' : signal.action === 'sell' ? '#fee2e2' : '#e0e7ff',
                      color: signal.action === 'buy' ? '#065f46' : signal.action === 'sell' ? '#991b1b' : '#3730a3',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {signal.action}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Confidence: {((signal.confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>{signal.reasoning}</p>
                </div>
              ))}
            </div>
          )}

          <details style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>
              View Raw JSON Data (Developer Mode)
            </summary>
            <pre style={{ marginTop: '1rem', padding: '1rem', background: '#ffffff', borderRadius: '6px', overflow: 'auto', fontSize: '0.75rem', maxHeight: '300px', border: '1px solid #e2e8f0' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    // Trading Strategy Result
    if (result.serviceId === 'trading-strategy' && result.result) {
      const data = result.result;
      const isArray = Array.isArray(data);
      
      return (
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Strategy Execution</h5>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Transaction: <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.transactionHash}</span>
            </p>
          </div>
          
          {isArray && data.length > 0 ? (
            <div>
              <h6 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Opportunities Found ({data.length})</h6>
              {data.map((item: any, idx: number) => (
                <div key={idx} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  {item.token && (
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem', color: '#64748b' }}>
                      Token: <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.token}</span>
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {item.profitEstimate !== undefined && (
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>Profit Estimate</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#059669' }}>
                          {item.profitEstimate.toFixed(4)} SOL
                        </p>
                      </div>
                    )}
                    {item.apy !== undefined && (
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>APY</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>
                          {item.apy.toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {item.protocol && (
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>Protocol</p>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>{item.protocol}</p>
                      </div>
                    )}
                    {item.dexA && item.dexB && (
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>DEX Pair</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                          {item.dexA} ↔ {item.dexB}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: 0 }}>No opportunities found at this time.</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>The agent will continue monitoring for profitable opportunities.</p>
            </div>
          )}

          <details style={{ marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>
              View Raw JSON Data (Developer Mode)
            </summary>
            <pre style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', overflow: 'auto', fontSize: '0.75rem', maxHeight: '300px', border: '1px solid #e2e8f0' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    // Data Aggregation Result
    if (result.serviceId === 'data-aggregation' && result.result) {
      const data = result.result;
      
      return (
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Aggregated Data</h5>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Transaction: <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.transactionHash}</span>
            </p>
          </div>

          {typeof data === 'string' ? (
            // Report string
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6', border: '1px solid #e2e8f0', maxHeight: '500px', overflow: 'auto' }}>
              {data}
            </div>
          ) : (
            // Structured data
            <div>
              {data.tokenMetrics && Object.keys(data.tokenMetrics).length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Token Metrics</h6>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(data.tokenMetrics).map(([token, metrics]: [string, any]) => (
                      <div key={token} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', fontSize: '0.85rem', color: '#64748b', wordBreak: 'break-all' }}>{token}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>Price</p>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>${metrics.price?.toFixed(4) || 'N/A'}</p>
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>24h Volume</p>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>${metrics.volume24h?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b' }}>24h Change</p>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: (metrics.priceChange24h || 0) >= 0 ? '#059669' : '#dc2626' }}>
                              {metrics.priceChange24h?.toFixed(2) || '0'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {data.marketTrends && Array.isArray(data.marketTrends) && data.marketTrends.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Market Trends</h6>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {data.marketTrends.map((trend: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: '600' }}>{trend.token}:</span>{' '}
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          background: trend.trend === 'bullish' ? '#d1fae5' : trend.trend === 'bearish' ? '#fee2e2' : '#e0e7ff',
                          color: trend.trend === 'bullish' ? '#065f46' : trend.trend === 'bearish' ? '#991b1b' : '#3730a3',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          marginLeft: '0.5rem'
                        }}>
                          {trend.trend}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <details style={{ marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>
              View Raw JSON Data (Developer Mode)
            </summary>
            <pre style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', overflow: 'auto', fontSize: '0.75rem', maxHeight: '300px', border: '1px solid #e2e8f0' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    // Fallback: show formatted JSON in collapsible section
    return (
      <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <details open>
          <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#0f172a', marginBottom: '1rem', fontSize: '1rem' }}>
            Service Result
          </summary>
          <pre style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', overflow: 'auto', fontSize: '0.85rem', maxHeight: '400px', border: '1px solid #e2e8f0' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div>Loading agent status...</div>
          <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold', color: '#1976d2' }}>
            {connectionStatus}
          </div>
          {debugLogs.length > 0 && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto',
              textAlign: 'left',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              <strong>Debug Logs:</strong>
              {debugLogs.map((log, idx) => (
                <div key={idx} style={{ marginTop: '5px', color: log.includes('❌') ? '#d32f2f' : log.includes('✅') ? '#2e7d32' : '#666' }}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="app">
        <div className="error">
          <h2>Failed to load agent status</h2>
          {error && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Connection Status: {connectionStatus}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button onClick={fetchStatus} style={{ padding: '10px 20px', cursor: 'pointer' }}>
              Retry Connection
            </button>
          </div>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <p>Make sure:</p>
            <ul>
              <li>Backend is running on http://localhost:3000</li>
              <li>Frontend dev server is running on http://localhost:5173</li>
              <li>Check browser console (F12) for more details</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Blockchain AI Agent</h1>
        <div className="status-indicator">
          <span className={`status-dot ${status.isRunning ? 'running' : 'stopped'}`}></span>
          <span>{status.isRunning ? 'Running' : 'Stopped'}</span>
        </div>
        {error && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            background: '#ffebee', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#c62828'
          }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ 
          marginTop: '5px', 
          fontSize: '12px', 
          color: connectionStatus.includes('✅') ? '#2e7d32' : connectionStatus.includes('❌') ? '#d32f2f' : '#666',
          fontWeight: 'bold'
        }}>
          {connectionStatus}
        </div>
        {debugLogs.length > 0 && (
          <details style={{ marginTop: '10px', fontSize: '11px' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>Show Debug Logs ({debugLogs.length})</summary>
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '10px'
            }}>
              {debugLogs.map((log, idx) => (
                <div key={idx} style={{ 
                  marginTop: '3px', 
                  color: log.includes('❌') ? '#d32f2f' : log.includes('✅') ? '#2e7d32' : '#666' 
                }}>
                  {log}
                </div>
              ))}
            </div>
          </details>
        )}
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'services' ? 'active' : ''}
          onClick={() => setActiveTab('services')}
        >
          Services
        </button>
        <button
          className={activeTab === 'earnings' ? 'active' : ''}
          onClick={() => setActiveTab('earnings')}
        >
          Earnings
        </button>
        <button
          className={activeTab === 'subagents' ? 'active' : ''}
          onClick={() => setActiveTab('subagents')}
        >
          Sub-Agents
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Balance</h3>
                <p className="stat-value">{status.balance?.toFixed(4) || '0.0000'} {status.network === 'solana' ? 'SOL' : 'BASE'}</p>
              </div>
              <div className="stat-card">
                <h3>Total Earnings</h3>
                <p className="stat-value">{status.earnings.total.toFixed(4)}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Revenue from services
                </p>
              </div>
              <div className="stat-card">
                <h3>Available</h3>
                <p className="stat-value">{status.earnings.available.toFixed(4)}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Ready for reinvestment
                </p>
              </div>
              <div className="stat-card">
                <h3>Reinvested</h3>
                <p className="stat-value">{status.earnings.reinvested.toFixed(4)}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Used for upgrades
                </p>
              </div>
            </div>

            <div className="info-card">
              <h2>Agent Information</h2>
              <div className="info-grid">
                <div>
                  <strong>ID:</strong> {status.id}
                </div>
                <div>
                  <strong>Name:</strong> {status.name}
                </div>
                <div>
                  <strong>Network:</strong> {status.network.toUpperCase()}
                </div>
                <div>
                  <strong>Active Services:</strong> {status.services.length}
                </div>
                <div>
                  <strong>Sub-Agents:</strong> {status.subAgents.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="services">
            <h2>Available Services</h2>
            <div className="services-grid">
              {status.services.map((service) => (
                <div key={service.id} className="service-card">
                  <h3>{service.name}</h3>
                  <p className="service-type">{service.type}</p>
                  <p className="service-price">Price: {service.price} {status.network === 'solana' ? 'SOL' : 'BASE'}</p>
                  <button
                    onClick={() => setSelectedService(service)}
                    className="service-button"
                  >
                    Use Service
                  </button>
                </div>
              ))}
            </div>

            {selectedService && (
              <div className="service-form">
                <h3>Request: {selectedService.name}</h3>
                {selectedService.type === 'market-analysis' && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                        Single Token Address (Optional)
                      </label>
                    <input
                      type="text"
                        placeholder="e.g., So11111111111111111111111111111111111111112 (SOL)"
                      value={serviceParams.token || ''}
                      onChange={(e) => setServiceParams({ ...serviceParams, token: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          marginBottom: '0.5rem', 
                          border: serviceParams.token && serviceParams.token.length > 0 && serviceParams.token.length < 32 
                            ? '2px solid #ef4444' 
                            : '1px solid #e5e7eb', 
                          borderRadius: '8px', 
                          background: '#f9fafb' 
                        }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                        Enter ONE Solana token address (base58 format, usually 32-44 characters). Leave empty to analyze SOL by default.
                      </p>
                      {serviceParams.token && serviceParams.token.length > 0 && serviceParams.token.length < 32 && (
                        <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '0.5rem 0 0 0', fontWeight: '600' }}>
                          Invalid format: Solana addresses are usually 32-44 characters long. Examples:
                        </p>
                      )}
                      {serviceParams.token && serviceParams.token.length > 0 && serviceParams.token.length < 32 && (
                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', fontSize: '0.75rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#991b1b' }}>Valid Solana Token Examples:</p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#7f1d1d' }}>
                            <li><strong>SOL:</strong> So11111111111111111111111111111111111111112</li>
                            <li><strong>USDC:</strong> EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</li>
                            <li><strong>USDT:</strong> Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB</li>
                          </ul>
                          <p style={{ margin: '0.5rem 0 0 0', color: '#991b1b' }}>
                            <strong>Note:</strong> "TRON" is a different blockchain. This tool only works with Solana token addresses.
                          </p>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                        Multiple Token Addresses (Optional)
                      </label>
                    <input
                      type="text"
                        placeholder="e.g., So11111111111111111111111111111111111111112, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                      value={serviceParams.tokens || ''}
                        onChange={(e) => setServiceParams({ ...serviceParams, tokens: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        Enter MULTIPLE token addresses separated by commas for comparison. Example: SOL, USDC addresses.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', fontSize: '0.85rem', color: '#1e40af', marginBottom: '1rem' }}>
                      <strong>Tip:</strong> If both fields are empty, the system will analyze SOL (native Solana token) by default.
                    </div>
                  </div>
                )}
                {selectedService.type === 'trading-strategy' && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                        Strategy Type
                      </label>
                    <select
                      value={serviceParams.strategy || 'arbitrage'}
                      onChange={(e) => setServiceParams({ ...serviceParams, strategy: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', fontSize: '1rem' }}
                      >
                        <option value="arbitrage">Arbitrage - Find price differences across DEXs</option>
                        <option value="yield-farming">Yield Farming - Optimize yield opportunities</option>
                        <option value="momentum">Momentum - Follow market trends</option>
                    </select>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        Select the trading strategy you want the AI agent to execute.
                      </p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                        Amount (Optional)
                      </label>
                    <input
                      type="number"
                        placeholder="e.g., 1.0 (amount in SOL to use for the strategy)"
                      value={serviceParams.amount || ''}
                        onChange={(e) => setServiceParams({ ...serviceParams, amount: parseFloat(e.target.value) || undefined })}
                        step="0.1"
                        min="0"
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        Enter the amount of SOL to use for this strategy. Leave empty to use default amounts.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', fontSize: '0.85rem', color: '#1e40af', marginBottom: '1rem' }}>
                      <strong>Note:</strong> 
                      <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                        <li><strong>Arbitrage:</strong> Finds price differences between Jupiter, Raydium, and Orca</li>
                        <li><strong>Yield Farming:</strong> Compares protocols like Marinade, Lido, Jito, Raydium LP, Orca LP</li>
                        <li><strong>Momentum:</strong> Analyzes market trends and generates trading signals</li>
                      </ul>
                    </div>
                  </div>
                )}
                {selectedService.type === 'data-aggregation' && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                        Token Addresses (Optional)
                      </label>
                    <input
                      type="text"
                        placeholder="e.g., So11111111111111111111111111111111111111112, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                      value={serviceParams.tokens || ''}
                        onChange={(e) => setServiceParams({ ...serviceParams, tokens: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        Enter multiple Solana token addresses separated by commas. Leave empty to aggregate data for SOL.
                      </p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <input
                        type="checkbox"
                        checked={serviceParams.report || false}
                        onChange={(e) => setServiceParams({ ...serviceParams, report: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Generate Report</span>
                    </label>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0', paddingLeft: '2rem' }}>
                        Check this to generate a formatted report with market trends, protocol analytics, and on-chain metrics.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.85rem', color: '#166534', marginBottom: '1rem' }}>
                      <strong>Data Aggregation includes:</strong>
                      <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                        <li>Token price metrics (price, volume, liquidity)</li>
                        <li>Market trends and momentum analysis</li>
                        <li>On-chain metrics from Helius</li>
                        <li>Protocol-level analytics</li>
                        <li>Social sentiment scores</li>
                      </ul>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#0369a1', fontWeight: '600' }}>
                    Payment Information
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#0c4a6e' }}>
                    <strong>Service Price:</strong> {selectedService.price} {status.network === 'solana' ? 'SOL' : 'BASE'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    {status.network === 'solana' 
                      ? 'Payment will be processed automatically via Solana blockchain. In production, you would connect your wallet (e.g., Phantom) to sign the transaction.'
                      : 'Payment will be processed automatically via Base network. In production, you would connect your wallet (e.g., MetaMask) to sign the transaction.'}
                  </p>
                </div>
                <button 
                  onClick={handleServiceRequest} 
                  className="submit-button" 
                  style={{ 
                    marginTop: '1rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Processing...
                    </span>
                  ) : (
                    `Submit Request & Pay ${selectedService.price} ${status.network === 'solana' ? 'SOL' : 'BASE'}`
                  )}
                </button>
                {serviceResult && (
                  <div className="service-result">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>Service Result</h4>
                      <button
                        onClick={() => setServiceResult(null)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#64748b'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    {renderServiceResult(serviceResult)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="earnings">
            <h2>Earnings Breakdown</h2>
            <div className="earnings-card">
              <div className="earnings-item">
                <strong>Total Earnings:</strong> {status.earnings.total.toFixed(4)}
              </div>
              <div className="earnings-item">
                <strong>Available:</strong> {status.earnings.available.toFixed(4)}
              </div>
              <div className="earnings-item">
                <strong>Reinvested:</strong> {status.earnings.reinvested.toFixed(4)}
              </div>
              <h3>By Service</h3>
              {Object.entries(status.earnings.byService).map(([serviceId, amount]) => (
                <div key={serviceId} className="earnings-item">
                  <strong>{serviceId}:</strong> {amount.toFixed(4)}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subagents' && (
          <div className="subagents">
            <h2>Sub-Agents ({status.subAgents.length})</h2>
            {status.subAgents.length === 0 ? (
              <p>No sub-agents spawned yet. The agent will spawn sub-agents when enough earnings are available.</p>
            ) : (
              <div className="subagents-grid">
                {status.subAgents.map((subAgent) => (
                  <div key={subAgent.id} className="subagent-card">
                    <h3>{subAgent.role}</h3>
                    <p><strong>ID:</strong> {subAgent.id}</p>
                    <p><strong>Status:</strong> {subAgent.status}</p>
                    <p><strong>Balance:</strong> {subAgent.balance.toFixed(4)}</p>
                    <p><strong>Created:</strong> {new Date(subAgent.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
