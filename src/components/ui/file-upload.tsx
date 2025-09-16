/**
 * File Upload Component
 * Reusable component for file uploads with drag & drop support
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  currentFile?: File | string;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'avatar' | 'document';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] },
  maxSize = 5 * 1024 * 1024, // 5MB default
  multiple = false,
  disabled = false,
  loading = false,
  currentFile,
  placeholder,
  className,
  variant = 'default',
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const onDropRejected = useCallback((rejectedFiles: any[]) => {
    // Handle rejected files (could show error message)
    console.warn('Files rejected:', rejectedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    maxSize,
    multiple,
    disabled: disabled || loading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'avatar':
        return 'w-32 h-32 rounded-full border-2 border-dashed';
      case 'document':
        return 'h-24 border border-dashed rounded-lg';
      default:
        return 'h-32 border-2 border-dashed rounded-lg';
    }
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    
    switch (variant) {
      case 'avatar':
        return 'Clique ou arraste uma foto';
      case 'document':
        return 'Clique ou arraste um documento';
      default:
        return 'Clique ou arraste um arquivo';
    }
  };

  const renderCurrentFile = () => {
    if (!currentFile) return null;

    const isString = typeof currentFile === 'string';
    const fileName = isString ? 'Arquivo atual' : currentFile.name;
    const isImage = isString ? true : currentFile.type.startsWith('image/');

    if (variant === 'avatar' && isImage) {
      const src = isString ? currentFile : URL.createObjectURL(currentFile);
      return (
        <div className="relative w-full h-full">
          <img
            src={src}
            alt="Avatar"
            className="w-full h-full object-cover rounded-full"
          />
          {onFileRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full p-2 bg-muted rounded">
        <div className="flex items-center space-x-2">
          {isImage ? (
            <Image className="w-4 h-4 text-muted-foreground" />
          ) : (
            <File className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground truncate">
            {fileName}
          </span>
        </div>
        {onFileRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center cursor-pointer transition-colors',
        getVariantStyles(),
        {
          'border-primary bg-primary/5': isDragActive || dragActive,
          'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragActive && !dragActive,
          'opacity-50 cursor-not-allowed': disabled || loading,
        },
        className
      )}
    >
      <input {...getInputProps()} />
      
      {currentFile ? (
        renderCurrentFile()
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-4">
          <Upload className={cn(
            'text-muted-foreground',
            variant === 'avatar' ? 'w-8 h-8' : 'w-6 h-6'
          )} />
          <div className="text-center">
            <p className={cn(
              'text-muted-foreground',
              variant === 'avatar' ? 'text-xs' : 'text-sm'
            )}>
              {loading ? 'Enviando...' : getPlaceholderText()}
            </p>
            {maxSize && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Máximo {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};