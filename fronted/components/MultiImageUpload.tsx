import React, { useRef, useState, useCallback, useEffect } from 'react';
import { uploadsService } from '../services/uploads.service';

interface MultiImageUploadProps {
  /** Current image URLs (for editing) */
  value?: string[];
  /** Callback when image URLs change */
  onChange: (urls: string[]) => void;
  /** Label for the upload area */
  label?: string;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Whether the upload is disabled */
  disabled?: boolean;
}

interface UploadSlot {
  id: string;
  url?: string;
  previewUrl?: string;
  status: 'empty' | 'uploading' | 'done' | 'error';
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  label = '上传实物照片',
  maxImages = 4,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<UploadSlot[]>([]);

  // Initialize slots based on value prop
  useEffect(() => {
    const initialSlots: UploadSlot[] = [];
    for (let i = 0; i < maxImages; i++) {
      if (value[i]) {
        initialSlots.push({
          id: `slot-${i}`,
          url: value[i],
          previewUrl: value[i],
          status: 'done',
        });
      } else {
        initialSlots.push({
          id: `slot-${i}`,
          status: 'empty',
        });
      }
    }
    setSlots(initialSlots);

    // Cleanup function to revoke any blob URLs
    return () => {
      initialSlots.forEach((slot) => {
        if (slot.previewUrl && slot.previewUrl.startsWith('blob:')) {
          uploadsService.revokePreviewUrl(slot.previewUrl);
        }
      });
    };
    // Only run on mount and when value length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = useCallback(async (file: File, slotIndex: number) => {
    if (disabled || slots[slotIndex].status === 'uploading') return;

    // Create preview
    const preview = uploadsService.createPreviewUrl(file);

    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        previewUrl: preview,
        status: 'uploading',
      };
      return newSlots;
    });

    try {
      const result = await uploadsService.uploadImage(file);

      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          url: result.url,
          previewUrl: result.url,
          status: 'done',
        };
        return newSlots;
      });

      // Update parent with new URLs
      const updatedUrls = slots.map((slot, idx) =>
        idx === slotIndex ? result.url : slot.url
      ).filter((url): url is string => !!url);
      onChange(updatedUrls);
    } catch (error) {
      console.error('Upload failed:', error);
      // Revoke preview on error
      uploadsService.revokePreviewUrl(preview);

      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          previewUrl: undefined,
          status: 'error',
        };
        return newSlots;
      });

      // Show error toast
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  }, [disabled, slots, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, slotIndex);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();

    if (disabled || slots[slotIndex].status === 'uploading') return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file, slotIndex);
    }
  }, [disabled, slots, handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = (slotIndex: number) => {
    if (!disabled && slots[slotIndex].status !== 'uploading') {
      // Find the input element and click it
      const input = document.getElementById(`file-input-${slotIndex}`) as HTMLInputElement;
      input?.click();
    }
  };

  const handleRemove = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (disabled || slots[slotIndex].status === 'uploading') return;

    const slot = slots[slotIndex];

    // Revoke preview URL if it's a blob
    if (slot.previewUrl && slot.previewUrl.startsWith('blob:')) {
      uploadsService.revokePreviewUrl(slot.previewUrl);
    }

    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[slotIndex] = {
        id: newSlots[slotIndex].id,
        status: 'empty',
      };
      return newSlots;
    });

    // Update parent with remaining URLs
    const updatedUrls = slots
      .map((s, idx) => (idx === slotIndex ? undefined : s.url))
      .filter((url): url is string => !!url);
    onChange(updatedUrls);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-900">
        {label}
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className={`aspect-square relative rounded-xl overflow-hidden border-2 transition-all
              ${slot.status === 'empty' ? 'border-dashed border-slate-300 bg-white/30' : 'border-slate-200'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${slot.status === 'uploading' ? 'border-orange-300 bg-orange-50/30' : ''}
            `}
            onClick={() => handleClick(index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragOver={handleDragOver}
          >
            <input
              id={`file-input-${index}`}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => handleInputChange(e, index)}
              className="hidden"
              disabled={disabled || slot.status === 'uploading'}
            />

            {slot.status === 'empty' && (
              <div className="w-full h-full flex flex-col items-center justify-center hover:bg-white/50 hover:border-orange-500/50 transition-all">
                <span className="material-symbols-outlined text-orange-500">add_a_photo</span>
                <span className="text-[10px] font-bold text-slate-500 mt-1">上传照片</span>
              </div>
            )}

            {slot.status === 'uploading' && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-500"></div>
                <p className="text-xs font-medium text-orange-600 mt-2">上传中...</p>
              </div>
            )}

            {slot.previewUrl && slot.status !== 'empty' && (
              <>
                <img
                  src={slot.previewUrl}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(index);
                      }}
                      className="p-1.5 bg-white rounded-full text-slate-900 hover:bg-slate-100 transition-colors"
                      title="更换图片"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(index, e)}
                      className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                      title="删除图片"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {slot.status === 'error' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                <span className="material-symbols-outlined text-red-500">error</span>
                <span className="text-[10px] font-bold text-red-500 mt-1">上传失败</span>
                <span className="text-[10px] text-red-400 mt-1">点击重试</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        最多上传 {maxImages} 张照片，支持 JPG、PNG、GIF、WebP，单张最大 5MB
      </p>
    </div>
  );
};

export default MultiImageUpload;
