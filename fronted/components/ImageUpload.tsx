import React, { useRef, useState, useCallback } from 'react';
import { uploadsService } from '../services/uploads.service';

interface ImageUploadProps {
  /** Current image URL (for editing) */
  value?: string;
  /** Callback when image URL changes */
  onChange: (url: string | undefined) => void;
  /** Label for the upload area */
  label?: string;
  /** Height of the upload area */
  height?: string;
  /** Accepted file types */
  accept?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Icon name (Material Symbols) */
  iconName?: string;
  /** Border color theme */
  theme?: 'primary' | 'emerald' | 'orange' | 'slate';
}

const themeColors = {
  primary: {
    border: 'hover:border-primary/50',
    icon: 'text-primary',
    hoverBg: 'hover:bg-primary/5',
  },
  emerald: {
    border: 'hover:border-emerald-500/50',
    icon: 'text-emerald-500',
    hoverBg: 'hover:bg-emerald-500/5',
  },
  orange: {
    border: 'hover:border-orange-500/50',
    icon: 'text-orange-500',
    hoverBg: 'hover:bg-orange-500/5',
  },
  slate: {
    border: 'hover:border-slate-400/50',
    icon: 'text-slate-500',
    hoverBg: 'hover:bg-slate-500/5',
  },
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = '点击或拖拽上传图片',
  height = 'h-40',
  accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
  disabled = false,
  iconName = 'image',
  theme = 'primary',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);

  const colors = themeColors[theme];

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Create preview
    const preview = uploadsService.createPreviewUrl(file);
    setPreviewUrl(preview);

    setIsUploading(true);
    try {
      const result = await uploadsService.uploadImage(file);
      setPreviewUrl(result.url);
      onChange(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
      // Revoke preview on error
      if (preview) {
        uploadsService.revokePreviewUrl(preview);
      }
      setPreviewUrl(value);
      // Show error toast
      if (error instanceof Error) {
        // Could use toast here if needed
        alert(error.message);
      }
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, onChange, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isUploading) return;

    setPreviewUrl(undefined);
    onChange(undefined);
  };

  // Update preview when value changes externally
  React.useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl && !value) {
        uploadsService.revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl, value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-900">
        {label}
      </label>
      <div
        className={`relative ${height} border-2 border-dashed rounded-xl bg-white/30 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
          ${isDragging ? 'border-current bg-slate-100' : 'border-slate-300 ' + colors.border + ' ' + colors.hoverBg}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {previewUrl ? (
          <>
            {/* Preview image */}
            <img
              src={previewUrl}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClick}
                  className="p-2 bg-white rounded-full text-slate-900 hover:bg-slate-100 transition-colors"
                  title="更换图片"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                  title="删除图片"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-current mb-2"></div>
                <p className="text-sm font-medium text-slate-600">上传中...</p>
              </>
            ) : (
              <>
                <span className={`material-symbols-outlined ${colors.icon} mb-2`}>add_photo_alternate</span>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG、GIF、WebP，最大 5MB</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
