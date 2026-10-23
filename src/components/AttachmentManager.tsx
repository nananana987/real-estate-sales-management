import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  Plus,
} from 'lucide-react';
import { AttachmentFile, AttachmentDocType } from '../types';
import {
  AttachmentPreviewModal,
  formatFileSize,
  downloadAttachmentFile,
} from './AttachmentPreviewModal';

export const DEFAULT_DOC_TYPES: AttachmentDocType[] = [
  '売買契約書',
  '重要事項説明書',
  '決済精算書',
  '請求書',
  '領収書',
  '見積書',
  '公図・測量図',
  '全部事項証明書(謄本)',
  '案内図・物件資料',
  'その他',
];

function inferDocTypeFromFileName(
  fileName: string,
  fallbackDocType: AttachmentDocType
): AttachmentDocType {
  const lower = fileName.toLowerCase();
  if (lower.includes('契約')) return '売買契約書';
  if (lower.includes('重説') || lower.includes('重要事項')) return '重要事項説明書';
  if (lower.includes('精算')) return '決済精算書';
  if (lower.includes('請求')) return '請求書';
  if (lower.includes('領収')) return '領収書';
  if (lower.includes('見積')) return '見積書';
  if (lower.includes('公図') || lower.includes('測量') || lower.includes('地積'))
    return '公図・測量図';
  if (lower.includes('謄本') || lower.includes('全部事項') || lower.includes('登記'))
    return '全部事項証明書(謄本)';
  if (lower.includes('案内図') || lower.includes('マイソク') || lower.includes('資料'))
    return '案内図・物件資料';
  return fallbackDocType;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface AttachmentManagerProps {
  attachments: AttachmentFile[];
  onChange: (updated: AttachmentFile[]) => void;
  title?: string;
  description?: string;
  defaultDocType?: AttachmentDocType;
  suggestedDocTypes?: AttachmentDocType[];
  contextLabel?: string;
  compact?: boolean;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments = [],
  onChange,
  title = '添付書類・証憑ファイル (PDF / 画像)',
  description = '契約書・請求書・領収書・公図などを複数添付できます（ドラッグ＆ドロップ対応）',
  defaultDocType = '売買契約書',
  suggestedDocTypes = DEFAULT_DOC_TYPES,
  contextLabel,
  compact = false,
}) => {
  const [selectedDocType, setSelectedDocType] =
    useState<AttachmentDocType>(defaultDocType);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<AttachmentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const newAttachments: AttachmentFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage =
          file.type.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);

        if (!isPdf && !isImage) {
          alert(
            `「${file.name}」はPDFまたは画像ファイルではありません。PDF (.pdf) または画像 (.jpg, .png 等) を選択してください。`
          );
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        const docType = inferDocTypeFromFileName(file.name, selectedDocType);

        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
          name: file.name,
          docType,
          mimeType:
            file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          size: file.size,
          dataUrl,
          createdAt: new Date().toISOString(),
        });
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('ファイルの読み込み中にエラーが発生しました。');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateDocType = (id: string, newDocType: AttachmentDocType) => {
    onChange(
      attachments.map(att => (att.id === id ? { ...att, docType: newDocType } : att))
    );
  };

  const handleRemove = (id: string, name: string) => {
    if (confirm(`添付ファイル「${name}」を削除しますか？`)) {
      onChange(attachments.filter(att => att.id !== id));
      if (previewTarget?.id === id) {
        setPreviewTarget(null);
      }
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,image/*"
          className="hidden"
          onChange={e => handleFilesSelected(e.target.files)}
        />
        {attachments.map(att => {
          const isPdf =
            att.mimeType === 'application/pdf' ||
            att.name?.toLowerCase().endsWith('.pdf');
          return (
            <div
              key={att.id}
              className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-blue-50 text-slate-800 border border-slate-200 hover:border-blue-300 rounded px-1.5 py-0.5 text-[10px] transition-colors group"
            >
              <button
                type="button"
                onClick={() => setPreviewTarget(att)}
                className="flex items-center space-x-1 cursor-pointer text-left"
                title={`${att.docType ? `[${att.docType}] ` : ''}${att.name} (${formatFileSize(att.size)}) - クリックでプレビュー`}
              >
                {isPdf ? (
                  <FileText className="w-3 h-3 text-red-600 shrink-0" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-blue-600 shrink-0" />
                )}
                {att.docType && (
                  <span className="font-bold text-slate-700">[{att.docType}]</span>
                )}
                <span className="truncate max-w-[110px] font-medium text-blue-700 group-hover:underline">
                  {att.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRemove(att.id, att.name)}
                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                title="削除"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-dashed border-slate-300 cursor-pointer transition-colors"
          title="PDFまたは画像を添付（複数選択可）"
        >
          <Plus className="w-2.5 h-2.5 text-blue-600" />
          <span>{isUploading ? '読込中...' : '添付'}</span>
        </button>

        {previewTarget && (
          <AttachmentPreviewModal
            attachment={previewTarget}
            attachmentsList={attachments}
            contextLabel={contextLabel}
            onClose={() => setPreviewTarget(null)}
            onSelectAttachment={setPreviewTarget}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        handleFilesSelected(e.dataTransfer.files);
      }}
      className={`rounded-lg border p-2.5 transition-all space-y-2 ${
        isDraggingOver
          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200'
          : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,image/*"
        className="hidden"
        onChange={e => handleFilesSelected(e.target.files)}
      />

      {/* Header & Upload Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-800">{title}</span>
          {attachments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {attachments.length}件
            </span>
          )}
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            {description}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
            className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            title="添付時のデフォルト書類種別"
          >
            {suggestedDocTypes.map(t => (
              <option key={t} value={t}>
                種別: {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>{isUploading ? '読込中...' : 'PDF・画像を追加 (複数可)'}</span>
          </button>
        </div>
      </div>

      {/* Attached Files List */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
          {attachments.map(att => {
            const isPdf =
              att.mimeType === 'application/pdf' ||
              att.name?.toLowerCase().endsWith('.pdf');
            const isImage =
              att.mimeType?.startsWith('image/') ||
              /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(att.name || '');

            return (
              <div
                key={att.id}
                className="bg-white rounded border border-slate-200 hover:border-blue-300 p-2 flex items-center justify-between gap-2 shadow-2xs transition-all"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {/* Thumbnail or PDF Icon */}
                  <button
                    type="button"
                    onClick={() => setPreviewTarget(att)}
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border overflow-hidden cursor-pointer ${
                      isPdf
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                    }`}
                    title="クリックしてプレビュー表示"
                  >
                    {isImage && att.dataUrl ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    ) : isPdf ? (
                      <span className="text-[9px] font-extrabold tracking-tighter">
                        PDF
                      </span>
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1">
                      <select
                        value={att.docType || 'その他'}
                        onChange={e => handleUpdateDocType(att.id, e.target.value)}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded px-1 py-0.2 border border-slate-200 focus:outline-hidden cursor-pointer"
                      >
                        {DEFAULT_DOC_TYPES.map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewTarget(att)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline truncate block max-w-full text-left mt-0.5 cursor-pointer"
                      title={att.name}
                    >
                      {att.name}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewTarget(att)}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title="プレビュー表示"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachmentFile(att)}
                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                    title="ダウンロード"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id, att.name)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-300 hover:border-blue-400 rounded bg-white/70 hover:bg-blue-50/30 py-2 px-3 text-center cursor-pointer transition-colors"
        >
          <p className="text-[11px] text-slate-500">
            クリックしてファイルを選択、またはここにPDF・画像をドラッグ＆ドロップ（複数添付可）
          </p>
        </div>
      )}

      {previewTarget && (
        <AttachmentPreviewModal
          attachment={previewTarget}
          attachmentsList={attachments}
          contextLabel={contextLabel}
          onClose={() => setPreviewTarget(null)}
          onSelectAttachment={setPreviewTarget}
        />
      )}
    </div>
  );
};

/**
 * 閲覧用の添付ファイルバッジ一覧コンポーネント（クリックでプレビューモーダルを起動）
 */
export const AttachmentBadgeList: React.FC<{
  attachments?: AttachmentFile[];
  contextLabel?: string;
  compact?: boolean;
}> = ({ attachments, contextLabel, compact = false }) => {
  const [previewTarget, setPreviewTarget] = useState<AttachmentFile | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {attachments.map(att => {
          const isPdf =
            att.mimeType === 'application/pdf' ||
            att.name?.toLowerCase().endsWith('.pdf');
          return (
            <button
              key={att.id}
              type="button"
              onClick={e => {
                e.stopPropagation();
                setPreviewTarget(att);
              }}
              className={`inline-flex items-center space-x-1 rounded border transition-colors cursor-pointer ${
                isPdf
                  ? 'bg-red-50/80 hover:bg-red-100 text-red-800 border-red-200'
                  : 'bg-blue-50/80 hover:bg-blue-100 text-blue-800 border-blue-200'
              } ${compact ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
              title={`${att.docType ? `[${att.docType}] ` : ''}${att.name} (${formatFileSize(att.size)}) - クリックでプレビュー`}
            >
              {isPdf ? (
                <FileText className="w-3 h-3 text-red-600 shrink-0" />
              ) : (
                <ImageIcon className="w-3 h-3 text-blue-600 shrink-0" />
              )}
              {att.docType && (
                <span className="font-bold">[{att.docType}]</span>
              )}
              <span className="truncate max-w-[140px] font-medium underline decoration-dotted">
                {att.name}
              </span>
            </button>
          );
        })}
      </div>

      {previewTarget && (
        <AttachmentPreviewModal
          attachment={previewTarget}
          attachmentsList={attachments}
          contextLabel={contextLabel}
          onClose={() => setPreviewTarget(null)}
          onSelectAttachment={setPreviewTarget}
        />
      )}
    </>
  );
};
