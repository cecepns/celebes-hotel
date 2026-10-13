import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  X,
  Upload,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VoucherScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [fileScanning, setFileScanning] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Play audio beep on successful QR scan
  const playSuccessBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      // AudioContext optional
    }
  };

  // Start Scanner
  const startCamera = async (facing = facingMode) => {
    setCameraError(null);
    setScanning(true);

    // Stop existing scanner if running
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.error('Error clearing scanner:', e);
      }
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
          return { width: Math.floor(edge), height: Math.floor(edge) };
        },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facing },
        config,
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame error ignored
        }
      );
    } catch (err) {
      console.error('Failed to start camera:', err);
      setCameraError(
        err.message || 'Kamera tidak dapat diakses. Pastikan izin kamera aktif.'
      );
      setScanning(false);
    }
  };

  // Handle Detected Code
  const handleDetected = async (code) => {
    playSuccessBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }

    // Stop camera immediately
    await stopCamera();
    onScanSuccess(code);
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Flip Camera
  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Handle Scan from Image File
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileScanning(true);
      const html5QrCode = new Html5Qrcode('qr-file-detector');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      toast.success('QR Code berhasil dibaca dari gambar!');
      handleDetected(decodedText);
    } catch (err) {
      toast.error('QR Code tidak ditemukan pada gambar tersebut.');
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      // Delay slightly for DOM render of #qr-reader-container
      const timer = setTimeout(() => {
        startCamera(facingMode);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                Scan QR Code Voucher
              </h3>
              <p className="text-[10px] text-slate-400">
                Arahkan kamera ke layar voucher tamu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-slate-800 shadow-inner flex items-center justify-center">
            {/* Target Reader DOM Element */}
            <div id="qr-reader-container" className="w-full h-full overflow-hidden" />

            {/* Hidden Element for File Scanning */}
            <div id="qr-file-detector" className="hidden" />

            {/* Scanning Overlay Visual (reticle + laser beam) */}
            {scanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* 4 Corner Crosshairs */}
                <div className="relative w-[210px] h-[210px] border-2 border-red-500/30 rounded-2xl">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg" />

                  {/* Animated Laser Beam */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-bounce" />
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Kamera Belum Aktif</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {cameraError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Akses Lagi
                </button>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="w-full flex items-center justify-between gap-2 mt-4 px-1">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              title="Ganti Kamera Depan / Belakang"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Ganti Kamera</span>
            </button>

            {/* Upload Image Alternative */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileScanning}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                title="Pilih Gambar Screenshot QR"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>{fileScanning ? 'Membaca...' : 'Scan File Gambar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Guidance */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            Tamu dapat membuka menu <strong className="text-white">Voucher Saya &rarr; Buka QR</strong> pada aplikasi mereka.
          </p>
        </div>
      </div>
    </div>
  );
};
