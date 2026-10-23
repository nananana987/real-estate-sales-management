import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import { AttachmentFile } from '../types';
import { ResizableModal } from './ResizableModal';

interface AttachmentPreviewModalProps {
  attachment: AttachmentFile | null;
  attachmentsList?: AttachmentFile[];
  contextLabel?: string;
  onClose: () => void;
  onSelectAttachment?: (attachment: AttachmentFile) => void;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMimeType || 'application/octet-stream';
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.error('Failed to convert dataUrl to Blob:', err);
    return null;
  }
}

export function downloadAttachmentFile(att: AttachmentFile): void {
  if (!att.dataUrl) {
    alert('添付ファイルのデータが見つかりません。');
    return;
  }
  const blob = dataUrlToBlob(att.dataUrl, att.mimeType);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name || '添付資料';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } else {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.name || '添付資料';
    a.click();
  }
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  attachmentsList = [],
  contextLabel,
  onClose,
  onSelectAttachment,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    setZoom(100);
    setRotation(0);
    if (!attachment || !attachment.dataUrl) {
      setBlobUrl(null);
      return;
    }
    const blob = dataUrlToBlob(attachment.dataUrl, attachment.mimeType);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(attachment.dataUrl);
    }
  }, [attachment]);

  if (!attachment) return null;

  const isPdf =
    attachment.mimeType === 'application/pdf' ||
    attachment.name?.toLowerCase().endsWith('.pdf');
  const isImage =
    attachment.mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.name || '');

  const currentIndex =
    attachmentsList.length > 1
      ? attachmentsList.findIndex(a => a.id === attachment.id)
      : -1;

  const handlePrev = () => {
    if (currentIndex > 0 && onSelectAttachment) {
      onSelectAttachment(attachmentsList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (
      currentIndex >= 0 &&
      currentIndex < attachmentsList.length - 1 &&
      onSelectAttachment
    ) {
      onSelectAttachment(attachmentsList[currentIndex + 1]);
    }
  };

  return (
    <ResizableModal
      onBackdropClick={onClose}
      defaultWidth={960}
      defaultHeight={760}
      minWidth={480}
      minHeight={400}
      storageKey="attachment_preview_modal"
      className="z-[70]"
    >
      {({ renderHeaderControls }) => (
        <>
          {/* Header */}
          <div className="px-4 py-2.5 bg-[#001529] text-white flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${
                  isPdf
                    ? 'bg-red-500/20 text-red-300 border-red-400/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                }`}
              >
                {isPdf ? (
                  <FileText className="w-4 h-4" />
                ) : isImage ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  {attachment.docType && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40 shrink-0">
                      {attachment.docType}
                    </span>
                  )}
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
                    {attachment.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-300">
                  {contextLabel && (
                    <>
                      <span className="text-amber-300 font-semibold">{contextLabel}</span>
                      <span>•</span>
                    </>
                  )}
                  <span className="font-mono">{formatFileSize(attachment.size)}</span>
                  {attachment.createdAt && (
                    <>
                      <span>•</span>
                      <span>登録: {attachment.createdAt.slice(0, 10)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Multiple attachments navigation */}
              {attachmentsList.length > 1 && currentIndex >= 0 && (
                <div className="flex items-center space-x-1 bg-white/10 px-2 py-1 rounded border border-white/15 mr-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex <= 0}
                    className="p-0.5 text-slate-200 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="前の添付書類"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-white px-1">
                    {currentIndex + 1} / {attachmentsList.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex >= attachmentsList.length - 1}
                    className="p-0.5 text-slate-200 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="次の添付書類"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Image Zoom & Rotate Controls */}
              {isImage && (
                <div className="hidden sm:flex items-center space-x-1 bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    className="p-1 text-slate-200 hover:text-white cursor-pointer"
                    title="縮小"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(100)}
                    className="text-[10px] font-mono text-white px-1 hover:underline cursor-pointer"
                    title="100%にリセット"
                  >
                    {zoom}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(300, z + 25))}
                    className="p-1 text-slate-200 hover:text-white cursor-pointer"
                    title="拡大"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-1 text-slate-200 hover:text-white cursor-pointer border-l border-white/15 pl-1.5"
                    title="90度回転"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Download Button */}
              <button
                type="button"
                onClick={() => downloadAttachmentFile(attachment)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="ファイルをPCに保存"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">保存</span>
              </button>

              {renderHeaderControls('dark')}

              <button
                type="button"
                onClick={onClose}
                className="text-slate-300 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thumbnail / Tab Strip when multiple attachments exist */}
          {attachmentsList.length > 1 && onSelectAttachment && (
            <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
              {attachmentsList.map((item, idx) => {
                const active = item.id === attachment.id;
                const itemIsPdf =
                  item.mimeType === 'application/pdf' ||
                  item.name?.toLowerCase().endsWith('.pdf');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectAttachment(item)}
                    className={`px-2 py-1 rounded text-[11px] flex items-center space-x-1.5 shrink-0 border transition-all cursor-pointer max-w-[220px] ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">#{idx + 1}</span>
                    {item.docType && (
                      <span
                        className={`px-1 py-0.1 rounded text-[9px] font-bold ${
                          active
                            ? 'bg-white/20 text-white'
                            : itemIsPdf
                            ? 'bg-red-50 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.docType}
                      </span>
                    )}
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Preview Body */}
          <div className="flex-1 bg-slate-800 overflow-auto flex items-center justify-center relative min-h-[420px]">
            {!blobUrl ? (
              <div className="text-center p-8 text-slate-300 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-xs font-semibold">
                  プレビューデータを読み込めませんでした
                </p>
              </div>
            ) : isPdf ? (
              <iframe
                src={blobUrl}
                title={attachment.name}
                className="w-full h-full min-h-[560px] border-0 bg-white"
              />
            ) : isImage ? (
              <div className="p-4 flex items-center justify-center min-h-full min-w-full overflow-auto">
                <img
                  src={blobUrl}
                  alt={attachment.name}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="max-w-full max-h-[75vh] object-contain rounded shadow-lg transition-transform duration-150 bg-white"
                />
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md text-center space-y-3 max-w-sm">
                <Paperclip className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800 break-all">
                  {attachment.name}
                </div>
                <p className="text-[11px] text-slate-500">
                  このファイル形式 ({attachment.mimeType || '不明'}) は直接表示できないため、保存してご確認ください。
                </p>
                <button
                  type="button"
                  onClick={() => downloadAttachmentFile(attachment)}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ファイルをダウンロード</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </ResizableModal>
  );
};
