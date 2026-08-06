'use client';

import { useEffect, useRef, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MobileSidecarPage({ params }) {
  const { id: submissionId } = use(params);
  const supabase = createClient();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Default to rear camera for desk view
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Join Supabase Realtime Channel for this submission
    const channel = supabase.channel(`proctor-sidecar-${submissionId}`);

    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          channel.send({
            type: 'broadcast',
            event: 'sidecar_connected',
            payload: { timestamp: Date.now() }
          });
        }
      });

    channelRef.current = channel;

    // 2. Start Mobile Camera
    startCamera(facingMode);

    // 3. Heartbeat loop (every 3 seconds)
    const heartbeatInterval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'sidecar_heartbeat',
          payload: { timestamp: Date.now(), batteryLevel: 100 }
        });
      }
    }, 3000);

    return () => {
      clearInterval(heartbeatInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'sidecar_disconnected',
          payload: { timestamp: Date.now() }
        });
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [submissionId, facingMode]);

  const startCamera = async (mode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError(`Camera error: ${err.message}. Please allow camera permissions in your mobile browser.`);
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1d',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🛡️</span>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>ExamGuard Sidecar</h1>
            <span style={{ fontSize: '0.75rem', color: connected ? '#34d399' : '#fb7185' }}>
              {connected ? '● Paired with Desktop' : '○ Connecting to Session...'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleCamera}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🔄 Flip Camera
        </button>
      </div>

      {/* Video Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#fb7185' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <p>{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Framing Guide Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '2px dashed rgba(99, 102, 241, 0.4)',
          margin: '20px',
          borderRadius: '16px',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#ffffff',
            alignSelf: 'center',
            textAlign: 'center'
          }}>
            📐 Position your phone on your side so your <strong>desk, keyboard, and hands</strong> are visible.
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center'
          }}>
            <span style={{
              background: cameraActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              border: `1px solid ${cameraActive ? '#34d399' : '#fb7185'}`,
              color: cameraActive ? '#34d399' : '#fb7185',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {cameraActive ? '🔴 LIVE PROCTOR STREAM ACTIVE' : 'INITIALIZING SENSORS...'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div style={{
        padding: '14px 20px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }}>
        Keep this screen open and active throughout your examination.
      </div>
    </div>
  );
}
