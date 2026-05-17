import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints);
    readerRef.current = codeReader;

    codeReader.listVideoInputDevices().then((devices) => {
      if (devices.length === 0) {
        setError('No camera found on this device.');
        return;
      }

      // Always prefer back/environment camera on mobile
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1]; // last device is usually back camera

      setScanning(true);

      // Use facingMode constraint for mobile browsers
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (result) {
            // Stop all tracks
            stream.getTracks().forEach(t => t.stop());
            codeReader.reset();
            onScan(result.getText());
          }
        });
      }).catch(() => {
        // Fallback to device id method
        codeReader.decodeFromVideoDevice(backCamera.deviceId, videoRef.current, (result) => {
          if (result) {
            codeReader.reset();
            onScan(result.getText());
          }
        });
      });

    }).catch(() => {
      setError('Camera permission denied or not available.');
    });

    return () => {
      if (readerRef.current) readerRef.current.reset();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <p style={styles.title}>📷 Point camera at barcode</p>
        {error && <p style={styles.error}>{error}</p>}
        {!error && (
          <>
            <video ref={videoRef} style={styles.video} autoPlay muted playsInline />
            <div style={styles.scanLine} />
          </>
        )}
        {scanning && !error && <p style={styles.hint}>Scanning... hold steady in good light</p>}
        <button onClick={onClose} style={styles.closeBtn}>✕ Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  box: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '420px', textAlign: 'center' },
  title: { fontSize: '16px', fontWeight: '600', marginBottom: '12px' },
  video: { width: '100%', borderRadius: '8px', border: '2px solid #10b981' },
  scanLine: { height: '3px', background: '#10b981', margin: '-3px 0 0 0', borderRadius: '2px', animation: 'none' },
  hint: { marginTop: '10px', fontSize: '13px', color: '#6b7280' },
  error: { color: '#ef4444', fontSize: '14px', marginTop: '8px' },
  closeBtn: { marginTop: '16px', padding: '10px 24px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};