'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconRefresh, IconUpload, IconX } from '@tabler/icons-react';
import { ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface ImageUploaderValue {
  id: string;
  preview: string;
  url?: string;
  status: UploadStatus;
  size?: number;
}

export interface ImageUploaderCopy {
  upload: string;
  uploading: string;
  failed: string;
  dropToUpload: string;
  replaceAriaLabel: string;
  removeAriaLabel: string;
  unsupportedFormat: (fileName: string) => string;
  exceedsLimit: (fileName: string, maxSizeMB: number) => string;
  partialAdd: (count: number) => string;
  uploadFailed: (errorMessage?: string) => string;
}

interface ImageUploaderProps {
  allowMultiple?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedMimeTypes?: string[];
  title?: string;
  emptyHint?: string;
  className?: string;
  defaultPreviews?: string[];
  onChange?: (items: ImageUploaderValue[]) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
  prepareFile?: (file: File) => Promise<File>;
  uploadHandler?: (file: File) => Promise<string>;
  compressBeforeUpload?: boolean;
  copy?: Partial<ImageUploaderCopy>;
}

interface UploadItem extends ImageUploaderValue {
  file?: File;
  uploadKey?: string;
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

/**
 * Image compression utility
 */
export const compressImage = async (
  file: File,
  quality = 0.7
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Failed to decode image file'));
      };
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], newName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      };
    };
  });
};

const defaultUploadImageFile = async (
  file: File,
  compressBeforeUpload = true
) => {
  const uploadableFile = compressBeforeUpload
    ? await compressImage(file)
    : file;

  const formData = new FormData();
  formData.append('files', uploadableFile);

  const response = await fetch('/api/storage/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  if (result.code !== 0 || !result.data?.urls?.length) {
    throw new Error(result.message || 'Upload failed');
  }

  return result.data.urls[0] as string;
};

export function ImageUploader({
  allowMultiple = false,
  maxImages = 1,
  maxSizeMB = 10,
  acceptedMimeTypes,
  title,
  emptyHint,
  className,
  defaultPreviews,
  onChange,
  disabled = false,
  onDisabledClick,
  prepareFile,
  uploadHandler,
  compressBeforeUpload = true,
  copy,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isInitializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const isInternalChangeRef = useRef(false);
  const replaceTargetIdRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  // 使用 defaultPreviews 初始化 items，只在组件挂载时执行一次
  const [items, setItems] = useState<UploadItem[]>(() => {
    if (defaultPreviews?.length) {
      return defaultPreviews.map((url, index) => ({
        id: `preset-${url}-${index}`,
        preview: url,
        url,
        status: 'uploaded' as UploadStatus,
      }));
    }
    return [];
  });

  const maxCount = allowMultiple ? maxImages : 1;
  const hasSizeLimit = maxSizeMB > 0;
  const maxBytes = hasSizeLimit
    ? maxSizeMB * 1024 * 1024
    : Number.POSITIVE_INFINITY;
  const uploaderCopy = useMemo<ImageUploaderCopy>(
    () => ({
      upload: 'Upload',
      uploading: 'Uploading...',
      failed: 'Failed',
      dropToUpload: 'Drop to upload',
      replaceAriaLabel: 'Upload a new image to replace',
      removeAriaLabel: 'Remove image',
      unsupportedFormat: (fileName: string) =>
        `"${fileName}" has an unsupported format`,
      exceedsLimit: (fileName: string, limitMB: number) =>
        `"${fileName}" exceeds the ${limitMB}MB limit`,
      partialAdd: (count: number) =>
        `Only the first ${count} image(s) will be added`,
      uploadFailed: (errorMessage?: string) =>
        errorMessage ? `Upload failed: ${errorMessage}` : 'Upload failed',
      ...copy,
    }),
    [copy]
  );
  const acceptedTypes = useMemo(
    () => acceptedMimeTypes?.map((type) => type.toLowerCase()) ?? [],
    [acceptedMimeTypes]
  );
  const acceptsAllImages = acceptedTypes.length === 0;
  const acceptValue = acceptsAllImages ? 'image/*' : acceptedTypes.join(',');

  const isAllowedImageType = (file: File) => {
    const fileType = file.type?.toLowerCase() || '';
    if (acceptsAllImages) {
      return fileType.startsWith('image/');
    }
    return acceptedTypes.includes(fileType);
  };

  const handleDisabledInteraction = () => {
    if (!disabled) {
      return false;
    }

    onDisabledClick?.();
    return true;
  };

  const uploadImageFile = async (file: File) => {
    const preparedFile = prepareFile ? await prepareFile(file) : file;

    if (uploadHandler) {
      return uploadHandler(preparedFile);
    }

    return defaultUploadImageFile(preparedFile, compressBeforeUpload);
  };

  // 更新 onChange ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 同步 defaultPreviews 的变化（只在外部变化时同步，避免循环）
  useEffect(() => {
    // 跳过初始化
    if (!isInitializedRef.current) {
      return;
    }

    // 如果是内部变化触发的，跳过
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    const defaultUrls = defaultPreviews || [];

    // 使用函数式更新来访问最新的 items
    setItems((currentItems) => {
      const currentUrls = currentItems
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);

      // 比较当前 items 和 defaultPreviews 是否一致
      const isSame =
        defaultUrls.length === currentUrls.length &&
        defaultUrls.every((url, index) => url === currentUrls[index]);

      // 只有当不一致时才返回新的 items
      if (!isSame) {
        return defaultUrls.map((url, index) => ({
          id: `preset-${url}-${index}`,
          preview: url,
          url,
          status: 'uploaded' as UploadStatus,
        }));
      }

      return currentItems;
    });
  }, [defaultPreviews]);

  // 清理 blob URLs
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [items]);

  // 当 items 变化时触发 onChange，但跳过初始化时的调用
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    // 标记这是内部变化
    isInternalChangeRef.current = true;

    onChangeRef.current?.(
      items.map(({ id, preview, url, status, size }) => ({
        id,
        preview,
        url,
        status,
        size,
      }))
    );
  }, [items]);

  const replaceItems = (pairs: Array<{ id: string; file: File }>) => {
    pairs.forEach(({ id, file }) => {
      const uploadKey = `${Date.now()}-${Math.random()}`;
      const nextPreview = URL.createObjectURL(file);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (item.preview.startsWith('blob:')) {
            URL.revokeObjectURL(item.preview);
          }
          return {
            ...item,
            preview: nextPreview,
            file,
            size: file.size,
            url: undefined,
            status: 'uploading' as UploadStatus,
            uploadKey,
          };
        })
      );

      uploadImageFile(file)
        .then((url) => {
          setItems((prev) =>
            prev.map((item) => {
              if (item.id !== id) return item;
              if (item.uploadKey !== uploadKey) return item; // stale upload
              if (item.preview.startsWith('blob:')) {
                URL.revokeObjectURL(item.preview);
              }
              return {
                ...item,
                preview: url,
                url,
                status: 'uploaded' as UploadStatus,
                file: undefined,
              };
            })
          );
        })
        .catch((error: any) => {
          console.error('Upload failed:', error);
          toast.error(uploaderCopy.uploadFailed(error?.message));
          setItems((prev) =>
            prev.map((item) => {
              if (item.id !== id) return item;
              if (item.uploadKey !== uploadKey) return item; // stale upload
              return { ...item, status: 'error' as UploadStatus };
            })
          );
        })
        .finally(() => {
          if (inputRef.current) inputRef.current.value = '';
        });
    });
  };

  const handleFiles = (selectedFiles: File[]) => {
    if (handleDisabledInteraction()) {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    const replaceTargetId = replaceTargetIdRef.current;
    if (replaceTargetId) {
      // reset immediately to avoid sticky replace mode
      replaceTargetIdRef.current = null;

      const file = selectedFiles[0];
      if (!file) return;
      if (!isAllowedImageType(file)) {
        toast.error(uploaderCopy.unsupportedFormat(file.name));
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      if (hasSizeLimit && file.size > maxBytes) {
        toast.error(uploaderCopy.exceedsLimit(file.name, maxSizeMB));
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      replaceItems([{ id: replaceTargetId, file }]);
      return;
    }

    const availableSlots = maxCount - items.length;
    const filesToAdd = selectedFiles
      .filter((file) => {
        if (!isAllowedImageType(file)) {
          toast.error(uploaderCopy.unsupportedFormat(file.name));
          return false;
        }
        if (hasSizeLimit && file.size > maxBytes) {
          toast.error(uploaderCopy.exceedsLimit(file.name, maxSizeMB));
          return false;
        }
        return true;
      })
      .slice(0, Math.max(availableSlots, 0));

    if (!filesToAdd.length) {
      // when full: replace from the end backwards
      if (items.length) {
        const normalized = selectedFiles.filter((file) =>
          isAllowedImageType(file)
        );
        if (!normalized.length) return;

        const k = Math.min(normalized.length, items.length);
        const tail = items.slice(-k);
        const pairs: Array<{ id: string; file: File }> = [];

        for (let i = 0; i < k; i += 1) {
          const targetId = tail[tail.length - 1 - i]?.id;
          const file = normalized[i];
          if (targetId && file) pairs.push({ id: targetId, file });
        }

        if (pairs.length) {
          replaceItems(pairs);
        }
      }

      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (availableSlots < selectedFiles.length) {
      toast.message(uploaderCopy.partialAdd(filesToAdd.length));
    }

    const newItems = filesToAdd.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      file,
      size: file.size,
      status: 'uploading' as UploadStatus,
      uploadKey: `${Date.now()}-${Math.random()}`,
    }));

    setItems((prev) => [...prev, ...newItems]);

    // Upload in parallel
    Promise.all(
      newItems.map(async (item) => {
        try {
          const url = await uploadImageFile(item.file as File);
          setItems((prev) => {
            const next = prev.map((current) => {
              if (current.id === item.id) {
                if (current.uploadKey && item.uploadKey) {
                  if (current.uploadKey !== item.uploadKey) return current; // stale upload
                }
                // Revoke the blob URL since we have the uploaded URL now
                if (current.preview.startsWith('blob:')) {
                  URL.revokeObjectURL(current.preview);
                }
                return {
                  ...current,
                  preview: url, // Replace preview with uploaded URL
                  url,
                  status: 'uploaded' as UploadStatus,
                  file: undefined,
                };
              }
              return current;
            });
            return next;
          });
        } catch (error: any) {
          console.error('Upload failed:', error);
          toast.error(uploaderCopy.uploadFailed(error?.message));
          setItems((prev) => {
            const next = prev.map((current) => {
              if (current.id !== item.id) return current;
              if (current.uploadKey && current.uploadKey !== item.uploadKey) {
                return current; // stale upload
              }
              return { ...current, status: 'error' as UploadStatus };
            });
            return next;
          });
        }
      })
    );

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (handleDisabledInteraction()) {
      event.currentTarget.value = '';
      return;
    }

    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    handleFiles(selectedFiles);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (handleDisabledInteraction()) {
      event.preventDefault();
      return;
    }

    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const files = clipboardItems
      .filter(
        (item) =>
          item.kind === 'file' &&
          (acceptsAllImages
            ? item.type.startsWith('image/')
            : acceptedTypes.includes(item.type.toLowerCase()))
      )
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];

    if (!files.length) return;
    event.preventDefault();
    handleFiles(files);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragActive(false);

    if (handleDisabledInteraction()) {
      return;
    }

    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      isAllowedImageType(file)
    );
    if (!files.length) return;
    handleFiles(files);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const removed = prev.find((item) => item.id === id);
      if (removed?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const openFilePicker = () => {
    if (handleDisabledInteraction()) {
      return;
    }

    inputRef.current?.click();
  };

  const openReplacePicker = (id: string) => {
    if (handleDisabledInteraction()) {
      return;
    }

    replaceTargetIdRef.current = id;
    openFilePicker();
  };

  const countLabel = useMemo(
    () => `${items.length}/${maxCount}`,
    [items.length, maxCount]
  );
  const isSingleMode = maxCount === 1;

  return (
    <div
      className={cn(
        'relative focus:outline-none',
        disabled && 'cursor-not-allowed opacity-80',
        isDragActive &&
          'ring-primary/70 ring-offset-background ring-2 ring-offset-2',
        className
      )}
      tabIndex={0}
      onPaste={handlePaste}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-sm">
          <div className="bg-background/80 text-foreground rounded-full px-4 py-2 text-sm font-medium shadow-sm">
            {uploaderCopy.dropToUpload}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptValue}
        multiple={allowMultiple}
        disabled={disabled}
        onChange={handleSelect}
        className="hidden"
      />

      {title && (
        <div className="text-foreground flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <ImageIcon className="text-primary h-4 w-4" />
            <span>{title}</span>
            <span className="text-primary text-xs">({countLabel})</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          'gap-4',
          isSingleMode ? 'flex flex-col' : 'flex flex-wrap'
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'group border-border bg-muted/50 hover:border-border hover:bg-muted relative overflow-hidden rounded-xl border p-1 shadow-sm transition',
              isSingleMode && 'w-full'
            )}
          >
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={item.preview}
                alt="Reference"
                className={cn(
                  'rounded-lg',
                  isSingleMode
                    ? 'h-56 w-full bg-black/5 object-contain sm:h-64'
                    : 'h-32 w-32 object-cover'
                )}
              />
              {item.size && (
                <span className="bg-background text-muted-foreground absolute bottom-2 left-2 rounded-md px-2 py-1 text-[10px] font-medium">
                  {formatBytes(item.size)}
                </span>
              )}
              {item.status !== 'uploading' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="bg-background/50 text-foreground hover:bg-background/50 h-10 w-10 rounded-full shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:ring-white/70"
                    onClick={() => openReplacePicker(item.id)}
                    aria-label={uploaderCopy.replaceAriaLabel}
                  >
                    <IconRefresh className="h-5 w-5" />
                  </Button>
                </div>
              )}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
                  {uploaderCopy.uploading}
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-500/70 text-xs font-medium text-white">
                  {uploaderCopy.failed}
                </div>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 z-20 h-7 w-7"
                onClick={() => {
                  if (handleDisabledInteraction()) {
                    return;
                  }

                  handleRemove(item.id);
                }}
                aria-label={uploaderCopy.removeAriaLabel}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {items.length < maxCount && (
          <div
            className={cn(
              'group border-border bg-muted/50 hover:border-border hover:bg-muted relative overflow-hidden rounded-xl border border-dashed p-1 shadow-sm transition',
              isSingleMode && 'w-full'
            )}
          >
            <div className="relative overflow-hidden rounded-lg">
              <button
                type="button"
                className={cn(
                  'flex flex-col items-center justify-center gap-2',
                  isSingleMode
                    ? 'h-48 w-full px-6 py-8 text-center sm:h-56'
                    : 'h-32 w-32'
                )}
                onClick={openFilePicker}
              >
                <div
                  className={cn(
                    'border-border flex items-center justify-center rounded-full border border-dashed',
                    isSingleMode ? 'h-14 w-14' : 'h-10 w-10'
                  )}
                >
                  <IconUpload className={cn(isSingleMode ? 'h-6 w-6' : 'h-5 w-5')} />
                </div>
                <span className={cn('font-medium', isSingleMode ? 'text-sm' : 'text-xs')}>
                  {uploaderCopy.upload}
                </span>
                {isSingleMode && emptyHint ? (
                  <span className="text-muted-foreground max-w-sm text-xs leading-5">
                    {emptyHint}
                  </span>
                ) : null}
                {hasSizeLimit ? (
                  <span className="text-primary text-xs">
                    Max {maxSizeMB}MB
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        )}
      </div>

      {!title && emptyHint && items.length === 0 && !isSingleMode && (
        <div className="text-muted-foreground text-xs">{emptyHint}</div>
      )}
    </div>
  );
}
