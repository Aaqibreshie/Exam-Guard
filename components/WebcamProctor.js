'use client';

import { useEffect, useRef, useState } from 'react';
import { VisionProctor } from '@/lib/vision-proctor';

export default function WebcamProctor({ onViolation, isExamActive = true }) {
  const videoRef = useRef(null);
  const visionRef = useRef(null);
  const [proctorStatus, setProctorStatus] = useState({
    isActive: false,
    hasPermissionError: false,
    faceCount: 0,
    isFocused: true,
    statusText: 'Initializing AI Proctor...',
    gazeDirection: 'center'
  });
  const [hasCameraError, setHasCameraError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const initWebcam = async () => {
    if (!videoRef.current) return;
    setIsRetrying(true);

    if (visionRef.current) {
      visionRef.current.stop();
    }

    const vision = new VisionProctor({
      onStatusUpdate: (status) => {
        setProctorStatus(status);
        if (status.hasPermissionError) {
          setHasCameraError(true);
          setErrorMessage(status.statusText);
        } else {
          setHasCameraError(false);
          setErrorMessage('');
        }
      },
      onViolation: (type, details) => {
        onViolation?.(type, details);
      }
    });

    visionRef.current = vision;
    const result = await vision.start(videoRef.current);
    if (!result?.success) {
      setHasCameraError(true);
      setErrorMessage(result?.message || 'Camera permission required.');
    } else {
      setHasCameraError(false);
      setErrorMessage('');
    }
    setIsRetrying(false);
  };

  useEffect(() => {
    if (!isExamActive) return;
    initWebcam();

    return () => {
      if (visionRef.current) {
        visionRef.current.stop();
      }
    };
  }, [isExamActive]);

  const getStatusColor = () => {
    if (!proctorStatus.isActive) return '#64748b';
    if (proctorStatus.faceCount === 0 || proctorStatus.faceCount > 1) return '#e11d48';
    if (!proctorStatus.isFocused) return '#d97706';
    return '#059669';
  };

  return (
    <div style={{
      width: '100%',
      borderRadius: '10px',
      overflow: 'hidden',
      background: '#f8fafc',
      border: '1px solid #e2e8f0'
    }}>
      {/* Video Viewport / Permission Error State */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '140px',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: hasCameraError ? 'none' : 'block'
          }}
        />

        {hasCameraError && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fecdd3', lineHeight: 1.4 }}>
              Camera Permission Denied
            </div>
            <button
              type="button"
              onClick={initWebcam}
              disabled={isRetrying}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                background: '#e11d48',
                borderColor: '#e11d48'
              }}
            >
              {isRetrying ? 'Checking...' : '🔄 Allow / Retry'}
            </button>
          </div>
        )}
      </div>

      {/* Live Status Bar */}
      <div style={{
        padding: '8px 12px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        borderTop: '1px solid #eaecf0',
        fontWeight: 700,
        color: hasCameraError ? '#e11d48' : getStatusColor()
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: hasCameraError ? '#e11d48' : getStatusColor(),
            display: 'inline-block'
          }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            {hasCameraError ? 'Camera Blocked' : proctorStatus.statusText}
          </span>
        </div>

        {!hasCameraError && proctorStatus.faceCount > 0 && (
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '6px',
            background: '#f1f5f9',
            color: '#334155'
          }}>
            👤 {proctorStatus.faceCount}
          </span>
        )}
      </div>
    </div>
  );
}
