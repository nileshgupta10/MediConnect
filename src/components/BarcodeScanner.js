import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [torchOn, setTorchOn] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: { ideal: 'continuous' },
            advanced: [{ focusMode: 'continuous' }],
          }
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        // Apply continuous autofocus if supported
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
        } catch {}

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('Scanning... point at barcode');

        // Dynamically import ZXing
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);

        function tick() {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const result = reader.decodeFromCanvas(canvas);
            if (result) {
              stopAll();
              onScan(result.getText());
              return;
            }
          } catch {}

          rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);

      } catch (err) {
        if (!cancelled) setError('Camera access denied. Please allow camera and reload.');
      }
    }

    start();
    return () => { cancelled = true; stopAll(); };
  }, []);

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(t => !t);
    } catch {
      setStatus('Torch not supported on this device');
    }
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
              <button onClick={toggleTorch} style={styles.torchBtn}>
                {torchOn ? '🔦 Torch OFF' : '🔦 Torch ON'}
              </button>
            </>
        }

        <button onClick={() => { stopAll(); onClose(); }} style={styles.closeBtn}>
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  box: { backgroundColor: '#111', borderRadius: '16px', padding: '20px', width: '92%', maxWidth: '440px', textAlign: 'center' },
  title: { fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#fff' },
  videoWrap: { position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' },
  video: { width: '100%', display: 'block', borderRadius: '10px' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: '70%', height: '100px', border: '3px solid #10b981', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' },
  hint: { marginTop: '10px', fontSize: '13px', color: '#9ca3af' },
  error: { color: '#ef4444', fontSize: '14px', margin: '16px 0' },
  torchBtn: { marginTop: '10px', padding: '8px 20px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginRight: '8px' },
  closeBtn: { marginTop: '12px', padding: '10px 28px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};