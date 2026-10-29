import React, { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const readerRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let codeReader = null;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

        const devices = await codeReader.listVideoInputDevices();
        if (devices.length === 0) {
          setError('Kamera topilmadi! Kompyuteringizda kamera borligini tekshiring.');
          return;
        }

        const controls = await codeReader.decodeFromVideoDevice(
          devices[0].deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              setScanning(false);
              onScan(result.getText());
              if (controls) controls.stop();
            }
          }
        );
      } catch (err) {
        setError('Kamera ishga tushmadi: ' + err.message);
      }
    }

    startScanner();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      {error ? (
        <div style={{ padding: 40, color: 'var(--danger)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="scanner-container">
            <video ref={videoRef} style={{ width: '100%' }} />
            {scanning && <div className="scanner-overlay" />}
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            📷 Barcode'ni kameraga ko'rsating
          </p>
        </>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-outline" onClick={onClose}>❌ Yopish</button>
      </div>
    </div>
  );
}
