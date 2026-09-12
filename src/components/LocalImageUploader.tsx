import React, { useRef, useState } from 'react';
import { Upload, Trash2, Link2, AlertCircle, Check, Image as ImageIcon, PenTool } from 'lucide-react';

interface LocalImageUploaderProps {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (dataUrlOrUrl: string) => void;
  recommendedDimensions?: string;
  type?: 'logo' | 'signature';
}

export const LocalImageUploader: React.FC<LocalImageUploaderProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  recommendedDimensions,
  type = 'logo',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setIsProcessing(true);

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        setIsProcessing(false);
        onChange(reader.result as string);
      };
      reader.onerror = () => {
        setIsProcessing(false);
        setError('Failed to read SVG file');
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1000;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Downsample only if very large
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            onChange(dataUrl);
            setIsProcessing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Preserve PNG transparency
          const isPng = file.type === 'image/png';
          const outputFormat = isPng ? 'image/png' : 'image/jpeg';
          const finalDataUrl = canvas.toDataURL(outputFormat, 0.9);
          onChange(finalDataUrl);
        } catch {
          onChange(dataUrl);
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        setError('Failed to decode image file');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setError('Failed to read file from disk');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (manualUrl.trim()) {
      setError(null);
      onChange(manualUrl.trim());
      setManualUrl('');
      setShowUrlInput(false);
    }
  };

  const hasImage = Boolean(value && value.trim().length > 0);

  return (
    <div id={`${id}-uploader-card`} className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            {type === 'signature' ? (
              <PenTool className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {label}
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
        </div>

        <button
          type="button"
          id={`${id}-toggle-url-btn`}
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition py-1 px-2 rounded-md hover:bg-slate-800"
        >
          <Link2 className="w-3 h-3" />
          <span>{showUrlInput ? 'Hide URL input' : 'Paste web URL'}</span>
        </button>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual URL Input Bar */}
      {showUrlInput && (
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
          <div className="text-[10px] text-slate-400">Direct image URL (https://...):</div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              id={`${id}-manual-url-input`}
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/asset.png"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              id={`${id}-apply-url-btn`}
              onClick={handleApplyUrl}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        id={`${id}-file-input`}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Drop Zone / Preview Box */}
      {hasImage ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Visual Thumbnail */}
            <div className="w-20 h-14 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
              <img
                src={value}
                alt={label}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Image loaded successfully</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {type === 'signature'
                  ? 'Appears in authorized signatory invoice footer'
                  : 'Appears on invoice templates & printouts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id={`${id}-change-btn`}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              id={`${id}-remove-btn`}
              onClick={() => onChange('')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          id={`${id}-dropzone`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-slate-700/80 bg-slate-950/40 hover:bg-slate-900/60 hover:border-slate-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200">
                {isProcessing ? 'Processing image...' : 'Click to upload or drag & drop'}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PNG, JPG, SVG or WebP (max 5MB)
                {recommendedDimensions && ` • ${recommendedDimensions}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
