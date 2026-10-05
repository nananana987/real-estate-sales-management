import React, { useState } from 'react';
import {
  AlertTriangle,
  HardDrive,
  FolderOpen,
  Plus,
  ShieldCheck,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { FileSaveStatus } from '../types';

interface LocalFileNotificationBannerProps {
  fileName: string | null;
  status: FileSaveStatus;
  errorMessage: string | null;
  onOpenFile: () => void;
  onCreateNewFile: () => void;
  onRequestPermission: () => void;
  onOpenModal: () => void;
  onSaveNow: () => void;
}

export const LocalFileNotificationBanner: React.FC<LocalFileNotificationBannerProps> = ({
  fileName,
  status,
  errorMessage,
  onOpenFile,
  onCreateNewFile,
  onRequestPermission,
  onOpenModal,
  onSaveNow,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // 保存完了または保存中の正常系、非対応ブラウザはバナーを表示しない
  if (status === 'saved' || status === 'saving' || status === 'unsaved' || status === 'unsupported') {
    return null;
  }

  // 1. パーミッション許可が必要な場合（閉じることも可能）
  if (status === 'permission_needed') {
    if (isDismissed) {
      return null;
    }
    return (
      <div className="bg-amber-50 border-b border-amber-300 text-amber-950 px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs no-print">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>保存先ファイルへのアクセス許可:</strong> 前回開いていた「
            <span className="font-mono underline font-bold">{fileName || 'データファイル'}</span>
            」への自動保存を再開するには、アクセス許可を行ってください。
            <span className="text-amber-800 ml-1 hidden lg:inline">
              （ブラウザの安全仕様により、再起動後に1回確認されます）
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onRequestPermission}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>アクセスを許可して再接続</span>
          </button>
          <button
            type="button"
            onClick={onOpenFile}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-amber-100/70 text-amber-900 rounded-md font-bold text-xs transition-colors cursor-pointer border border-amber-300"
          >
            <FolderOpen className="w-3 h-3 text-blue-600" />
            <span>別のファイルを開く</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-amber-200/70 rounded text-amber-700 hover:text-amber-950 transition-colors cursor-pointer ml-1"
            title="通知を閉じる（ヘッダーの「再接続を許可」からいつでも接続できます）"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. エラー発生時（最重要・非表示不可）
  if (status === 'error') {
    return (
      <div className="bg-rose-600 text-white px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs no-print">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
          <span>
            <strong>保存エラー:</strong> {errorMessage || 'ファイルへの書き込みに失敗しました。'}
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onSaveNow}
            className="inline-flex items-center space-x-1 px-3 py-1 bg-white text-rose-900 hover:bg-rose-50 rounded-md font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-rose-700" />
            <span>再試行</span>
          </button>
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-md font-bold text-xs transition-colors cursor-pointer border border-rose-400"
          >
            <FileText className="w-3 h-3" />
            <span>ファイル設定</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. ファイル未選択時（ガイドバナー）
  if (status === 'no_file' && !isDismissed) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 text-blue-900 px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs no-print">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 shrink-0 text-blue-600" />
          <span>
            <strong>PCローカル直接保存:</strong> 保存先ファイル（data.jsonなど）を選択すると、PC上のファイルへ変更が自動で直接上書き保存されます。
            <span className="text-blue-700 ml-1 hidden md:inline">（未選択の間はブラウザ内一時メモリで動作します）</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onOpenFile}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <FolderOpen className="w-3 h-3" />
            <span>ファイルを開く</span>
          </button>
          <button
            type="button"
            onClick={onCreateNewFile}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-md font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>新規ファイル作成</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
