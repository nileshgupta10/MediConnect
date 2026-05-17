import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const readerRef = useRef(new BrowserMultiFormatReader());
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Starting camera...');

  useEffect(() => {
    startCamera();
    return () => stopAll();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('Scanning... hold steady');
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setError('Camera access denied. Please allow camera permission and reload.');
    }
  }

  function scanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = readerRef.current.decodeFromImageData
        ? null // skip — use luminance source below
        : null;

      // Use ZXing luminance source decode
      readerRef.current.decodeFromCanvas(canvas).then(res => {
        if (res) {
          stopAll();
          onScan(res.getText());
        } else {
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      }).catch(() => {
        rafRef.current = requestAnimationFrame(scanFrame);
      });
    } catch {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <p style={styles.title}>📷 Scan Barcode</p>
        {error
          ? <p style={styles.error}>{error}</p>
          : <>
              <div style={styles.videoWrap}>
                <video ref={videoRef} style={styles.video} autoPlay muted playsInline />
                <div style={styles.scanOverlay}>
                  <div style={styles.scanBox} />
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <p style={styles.hint}>{status}</p>
            </>
        }
        <button onClick={() => { stopAll(); onClose(); }} style={styles.closeBtn}>✕ Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  box: { backgroundColor: '#111', borderRadius: '16px', padding: '20px', width: '92%', maxWidth: '440px', textAlign: 'center' },
  title: { fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#fff' },
  videoWrap: { position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' },
  video: { width: '100%', display: 'block', borderRadius: '10px' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: '65%', height: '120px', border: '3px solid #10b981', borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' },
  hint: { marginTop: '12px', fontSize: '13px', color: '#9ca3af' },
  error: { color: '#ef4444', fontSize: '14px', margin: '16px 0' },
  closeBtn: { marginTop: '16px', padding: '10px 28px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};