import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react';

const QRScanner = ({ onScanSuccess, isScanning, onToggleScanning }) => {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera devices detected on this device.');
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
        setCameraError('Camera access requires permission or HTTPS/localhost.');
      });

    return () => {
      // Ensure scanner is stopped on unmount
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch((e) => console.log('Scanner stop err', e));
        }
      }
    };
  }, []);

  // Handle start/stop camera based on isScanning prop
  useEffect(() => {
    const scannerElementId = 'qr-reader-container';

    if (isScanning && selectedCameraId) {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerElementId);
      }

      const qrConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      html5QrCodeRef.current
        .start(
          selectedCameraId,
          qrConfig,
          (decodedText) => {
            // Success callback
            if (onScanSuccessRef.current) {
              onScanSuccessRef.current(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore frame-by-frame scanning non-detection messages
          }
        )
        .catch((err) => {
          console.error('Failed to start Html5Qrcode scanner:', err);
          setCameraError('Unable to activate camera stream: ' + (err.message || err));
          if (onToggleScanning) onToggleScanning(false);
        });
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            // Stopped
          })
          .catch((e) => console.log('Error stopping scanner:', e));
      }
    }
  }, [isScanning, selectedCameraId]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Viewfinder Container */}
      <div className="relative w-full max-w-sm aspect-square bg-slate-950 rounded-2xl border-2 border-slate-700 overflow-hidden shadow-2xl flex items-center justify-center">
        {/* html5-qrcode mount target */}
        <div id="qr-reader-container" className="w-full h-full object-cover" />

        {/* Viewfinder overlay graphics when scanning */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-64 h-64 border-2 border-indigo-400/70 rounded-2xl">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br-lg" />

              {/* Animated Laser line */}
              <div className="scanner-laser" />
            </div>
            <p className="mt-3 text-xs font-mono font-semibold text-indigo-300 bg-slate-900/90 px-3 py-1 rounded-full border border-indigo-500/30">
              Align QR Pass Inside Box
            </p>
          </div>
        )}

        {/* Placeholder when camera is inactive */}
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/90 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <CameraOff className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-white">Camera Standby</p>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1">
              Click below to initiate the live optical gate scanner.
            </p>
          </div>
        )}
      </div>

      {/* Camera error message */}
      {cameraError && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs max-w-sm w-full">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Controls & Switcher */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full max-w-sm">
        <button
          type="button"
          onClick={() => onToggleScanning(!isScanning)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            isScanning
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-4 h-4" />
              Pause Camera
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Start Live Camera
            </>
          )}
        </button>

        {cameras.length > 1 && (
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            disabled={isScanning}
            className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Camera ${cam.id.substring(0, 5)}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
