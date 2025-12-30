/**
 * 文档上传组件
 */

import { useCallback, useRef, useState } from 'react';
import { useUploadDocument } from '../../hooks/useDocuments';
import Button from '../atoms/Button';

interface DocumentUploadProps {
  domainId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// 支持的文件类型
const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES).join(',');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function DocumentUpload({ domainId, onSuccess, onError }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useUploadDocument(domainId);

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(file.type) ||
      Object.values(ACCEPTED_FILE_TYPES).some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      return '不支持的文件类型。支持的格式：PDF、DOCX、XLSX、TXT、MD';
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return `文件过大。最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      onError?.(new Error(error));
      return;
    }
    setSelectedFile(file);
  }, [onError]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      await uploadMutation.mutateAsync({
        file: selectedFile,
        onProgress: setUploadProgress,
      });
      setSelectedFile(null);
      setUploadProgress(null);
      onSuccess?.();
    } catch (error) {
      setUploadProgress(null);
      onError?.(error instanceof Error ? error : new Error('上传失败'));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const isUploading = uploadProgress !== null;

  return (
    <div className="space-y-4">
      {/* 拖拽区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600">
            <span className="text-blue-600 hover:text-blue-500">点击上传</span>
            {' '}或拖拽文件到此处
          </div>
          <p className="text-xs text-gray-500">
            支持 PDF、DOCX、XLSX、TXT、MD 格式，最大 50MB
          </p>
        </div>
      </div>

      {/* 已选择的文件 */}
      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 上传进度 */}
          {isUploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 上传按钮 */}
      {selectedFile && !isUploading && (
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
            上传文档
          </Button>
        </div>
      )}
    </div>
  );
}
