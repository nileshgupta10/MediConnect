import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let scanner;

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode');

      scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 120 },
        aspectRatio: 1.7,
        supportedScanTypes: [0], // 0 = camera only
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // uses native browser API if available
        },
      };

      try {
        await scanner.start(
  { facingMode: { exact: 'environment' } }, // force back camera
          config,
          (decodedText) => {
            stopScanner(scanner);
            onScan(decodedText);
          },
          () => {} // ignore per-frame errors
        );
      } catch (err) {
        // Fallback: try any camera
        try {
          await scanner.start(
            { facingMode: 'user' },
            config,
            (decodedText) => {
              stopScanner(scanner);
              onScan(decodedText);
            },
            () => {}
          );
        } catch {
          setError('Camera access denied. Please allow camera permission and try again.');
        }
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) stopScanner(scannerRef.current);
    };
  }, []);

  function stopScanner(scanner) {
    try {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    } catch {}
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <p style={styles.title}>📷 Scan Barcode</p>

        {error
          ? <p style={styles.error}>{error}</p>
          : <p style={styles.hint}>Point at barcode — auto-detects</p>
        }

        {/* html5-qrcode mounts into this div */}
        <div id="qr-reader" style={styles.reader} />

        <button
          onClick={() => {
            if (scannerRef.current) stopScanner(scannerRef.current);
            onClose();
          }}
          style={styles.closeBtn}
        >
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  box: { backgroundColor: '#111', borderRadius: '16px', padding: '20px', width: '92%', maxWidth: '440px', textAlign: 'center' },
  title: { fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#fff' },
  hint: { fontSize: '13px', color: '#9ca3af', marginBottom: '10px' },
  reader: { width: '100%', borderRadius: '10px', overflow: 'hidden' },
  error: { color: '#ef4444', fontSize: '14px', margin: '16px 0' },
  closeBtn: { marginTop: '16px', padding: '10px 28px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};