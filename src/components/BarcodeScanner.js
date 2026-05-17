import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader.listVideoInputDevices().then((devices) => {
      if (devices.length === 0) {
        setError('No camera found on this device.');
        return;
      }

      // Prefer back camera on phones
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      const deviceId = backCamera ? backCamera.deviceId : devices[0].deviceId;

      setScanning(true);
      codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          onScan(result.getText());
          codeReader.reset();
        }
        // Ignore continuous decode errors — they fire while scanning
      });
    }).catch(() => {
      setError('Camera permission denied or not available.');
    });

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <p style={styles.title}>📷 Point camera at barcode</p>

        {error && <p style={styles.error}>{error}</p>}

        {!error && (
          <video
            ref={videoRef}
            style={styles.video}
            autoPlay
            muted
            playsInline
          />
        )}

        {scanning && !error && (
          <p style={styles.hint}>Scanning... hold steady</p>
        )}

        <button onClick={onClose} style={styles.closeBtn}>
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    width: '90%',
    maxWidth: '420px',
    textAlign: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  video: {
    width: '100%',
    borderRadius: '8px',
    border: '2px solid #10b981',
  },
  hint: {
    marginTop: '10px',
    fontSize: '13px',
    color: '#6b7280',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '8px',
  },
  closeBtn: {
    marginTop: '16px',
    padding: '10px 24px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
  },
};