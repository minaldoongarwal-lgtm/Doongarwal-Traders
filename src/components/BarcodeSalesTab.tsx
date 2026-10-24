import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Zap, 
  RotateCcw, 
  Package, 
  Keyboard, 
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, ScanResult } from '../types';
import { playSound } from '../utils/sound';

interface BarcodeSalesTabProps {
  products: Product[];
  onScanBarcode: (barcode: string) => Promise<ScanResult>;
  onUnknownBarcode: (barcode: string) => void;
  onGoToApprovals: (draftId?: string) => void;
}

export const BarcodeSalesTab: React.FC<BarcodeSalesTabProps> = ({
  products,
  onScanBarcode,
  onUnknownBarcode,
  onGoToApprovals
}) => {
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<Array<ScanResult & { id: string }>>([]);
  
  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global Keydown listener for USB/Bluetooth barcode scanners
  // Scanners send keystrokes rapidly (<50ms) followed by 'Enter'
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in standard textareas or modals
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target !== inputRef.current)) {
        return;
      }

      const currentTime = Date.now();
      const char = e.key;

      if (char === 'Enter') {
        if (buffer.length >= 3) {
          const barcodeToScan = buffer;
          buffer = '';
          executeScan(barcodeToScan);
          e.preventDefault();
        }
        return;
      }

      // Check time gap between keypresses
      if (currentTime - lastKeyTime > 120) {
        buffer = ''; // Reset buffer if slow typing
      }
      lastKeyTime = currentTime;

      if (char.length === 1) {
        buffer += char;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // Execute Scan
  const executeScan = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean || isProcessing) return;

    setIsProcessing(true);
    setManualInput('');

    try {
      const result = await onScanBarcode(clean);
      setLastScanResult(result);

      if (result.success) {
        if (result.breached) {
          playSound('warning');
        } else {
          playSound('success');
        }

        setRecentScans(prev => [
          { ...result, id: `${Date.now()}_${Math.random()}` },
          ...prev.slice(0, 19)
        ]);
      } else {
        playSound('error');
        // Handle unknown barcode gracefully
        onUnknownBarcode(clean);
      }
    } catch (err: any) {
      playSound('error');
      console.error('Scan error:', err);
    } finally {
      setIsProcessing(false);
      // Re-focus manual input for next scan
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      executeScan(manualInput);
    }
  };

  // Safely stop and clear Html5Qrcode instance without throwing unhandled exceptions
  const safeStopScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err) {
      // Catch and absorb any 'Cannot stop, scanner is not running or paused' errors safely
    }
    try {
      scanner.clear();
    } catch (e) {
      // Ignore DOM element removal errors
    }
    html5QrCodeRef.current = null;
  };

  // Camera Scanner toggle
  const toggleCamera = async () => {
    if (isCameraActive) {
      await safeStopScanner();
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      setCameraError(null);
      setIsCameraActive(true);
    }
  };

  const startCameraScanner = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser environment. You can use USB/Bluetooth barcode scanners or the 1-click test buttons below.');
      setIsCameraActive(false);
      return;
    }

    const container = document.getElementById('camera-reader-element');
    if (!container) {
      setIsCameraActive(false);
      return;
    }

    try {
      await safeStopScanner();

      const html5QrCode = new Html5Qrcode('camera-reader-element');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.6
        },
        (decodedText) => {
          // Barcode recognized from camera feed
          executeScan(decodedText);
        },
        () => {
          // Scan frame ignore
        }
      );
      setCameraError(null);
    } catch (err: any) {
      const errStr = String(err?.message || err || '');
      console.warn('Camera scanner note:', errStr);

      if (err?.name === 'NotAllowedError' || errStr.toLowerCase().includes('permission denied')) {
        setCameraError('Camera permission was blocked by your browser. Please allow camera permissions in your browser URL bar/site settings, or use the physical USB scanner / 1-click simulation below.');
      } else if (err?.name === 'NotFoundError' || errStr.toLowerCase().includes('device not found')) {
        setCameraError('No video camera was detected on this device. Please connect a webcam or use barcode simulation.');
      } else {
        setCameraError(errStr || 'Unable to initialize device camera.');
      }

      await safeStopScanner();
      setIsCameraActive(false);
    }
  };

  // Safe camera lifecycle management
  useEffect(() => {
    let isCancelled = false;

    if (isCameraActive) {
      const timer = setTimeout(async () => {
        if (!isCancelled) {
          await startCameraScanner();
        }
      }, 150);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        safeStopScanner();
      };
    } else {
      safeStopScanner();
    }
  }, [isCameraActive]);

  return (
    <div className="space-y-6">
      {/* Sales Scanner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Barcode className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Barcode Sales Terminal</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Atomic Decrement Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Ready for USB / Bluetooth wireless scanners, device camera barcode capture, or keyboard entry. Every scan immediately decrements available stock by 1 and checks minimum threshold rules.
              </p>
            </div>
          </div>

          <button
            onClick={toggleCamera}
            className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md ${
              isCameraActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-4 h-4" />
                <span>Stop Camera Scanner</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Scan with Camera</span>
              </>
            )}
          </button>
        </div>

        {/* Input Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleManualSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Scan with handheld scanner or enter barcode digits..."
                disabled={isProcessing}
                className="w-full pl-11 pr-4 py-3 bg-slate-800/90 text-white placeholder-slate-400 border border-slate-700 rounded-xl text-base font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !manualInput.trim()}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              {isProcessing ? 'Processing...' : 'Record Sale (-1)'}
            </button>
          </form>
        </div>

        {/* Camera Scanner Viewport */}
        {isCameraActive && (
          <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Camera Active: Point barcode inside target box</span>
              </div>
              <button
                onClick={toggleCamera}
                className="text-slate-400 hover:text-white underline"
              >
                Close Viewfinder
              </button>
            </div>
            <div 
              id="camera-reader-element" 
              className="w-full max-w-md mx-auto overflow-hidden rounded-lg bg-black"
            />
          </div>
        )}

        {cameraError && (
          <div className="mt-4 p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Camera Notice</p>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{cameraError}</p>
                <p className="text-slate-400 mt-1">Tip: You can plug in any USB/Bluetooth barcode scanner or use the 1-click test cards below.</p>
              </div>
            </div>
            <button
              onClick={() => setCameraError(null)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Confirmation of Recent Scan Result (Prominent Visual Confirmation) */}
      {lastScanResult && (
        <div className={`p-5 rounded-2xl border-2 shadow-lg transition-all ${
          !lastScanResult.success
            ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/30 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            : lastScanResult.breached
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-500 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`p-3 rounded-xl ${
                !lastScanResult.success
                  ? 'bg-rose-500 text-white'
                  : lastScanResult.breached
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-emerald-500 text-white shadow-md'
              }`}>
                {!lastScanResult.success ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : lastScanResult.breached ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 border border-current/20">
                    {lastScanResult.success ? 'Confirmed Sale' : 'Scan Rejected'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Barcode: {lastScanResult.barcode}
                  </span>
                </div>

                <h2 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">
                  {lastScanResult.product?.name ?? lastScanResult.message}
                </h2>

                {lastScanResult.success && lastScanResult.product && (
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Previous Stock: <span className="line-through text-slate-400">{lastScanResult.previousQuantity}</span>
                    </span>
                    <span className="font-bold text-sm px-2 py-0.5 rounded bg-emerald-600 text-white">
                      New Available Stock: {lastScanResult.newQuantity} units
                    </span>
                    <span className="text-slate-500">
                      Min Threshold: {lastScanResult.product.minimumQuantity}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Breach Alert Action */}
            {lastScanResult.breached && lastScanResult.product && (
              <div className="bg-amber-100/90 dark:bg-amber-900/40 p-3 rounded-xl border border-amber-300 dark:border-amber-700 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Minimum Stock Breached!</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 text-right">
                  Deficit = {lastScanResult.product.minimumQuantity - (lastScanResult.newQuantity ?? 0)} units. Reorder draft queued.
                </p>
                <button
                  onClick={() => onGoToApprovals(lastScanResult.draftId)}
                  className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Review Reorder Draft</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Test Barcode Buttons (Convenient 1-Click Simulation for all products) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick-Test Hardware Simulation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any product card below to simulate a real physical barcode scan from a handheld scanner.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:block">
            Atomic Decrement (-1/click)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => {
            const isBreached = product.currentQuantity < product.minimumQuantity;
            const isZero = product.currentQuantity <= 0;

            return (
              <button
                key={product.id}
                onClick={() => executeScan(product.barcode)}
                disabled={isProcessing}
                className={`text-left p-3.5 rounded-xl border transition-all relative group flex flex-col justify-between ${
                  isZero
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 opacity-70 hover:opacity-100'
                    : isBreached
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-500 hover:shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold">
                      {product.barcode}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isZero
                        ? 'bg-rose-500 text-white'
                        : isBreached
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {isZero ? '0 Left' : `${product.currentQuantity} ${product.unit || 'In Stock'}`}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {product.name}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Min: {product.minimumQuantity} {product.unit || ''}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Scan -1</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Test unknown barcode button */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Need to test unknown barcode error handling?</span>
          </div>
          <button
            onClick={() => executeScan('999988887777')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Scan Unregistered Barcode (999988887777)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Scans Session Feed */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent POS Scans (This Session)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {recentScans.length} logged
          </span>
        </div>

        {recentScans.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No scans registered yet in this session. Scan a barcode above to begin selling.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentScans.map(scan => (
              <div key={scan.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    -1
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {scan.product?.name ?? 'Unknown item'}
                    </span>
                    <span className="text-slate-400 ml-2 font-mono text-[11px]">
                      {scan.barcode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-slate-500">
                    Remaining: <span className="font-bold text-slate-800 dark:text-slate-200">{scan.newQuantity}</span>
                  </div>
                  {scan.breached && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Breached Min
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    {new Date(scan.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
