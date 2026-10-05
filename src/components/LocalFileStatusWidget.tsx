import React from 'react';
import {
  FileText,
  FolderOpen,
  Plus,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  HardDrive,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { FileSaveStatus } from '../types';

interface LocalFileStatusWidgetProps {
  fileName: string | null;
  status: FileSaveStatus;
  lastSavedAt: Date | null;
  isSupported: boolean;
  onOpenFile: () => void;
  onCreateNewFile: () => void;
  onRequestPermission: () => void;
  onOpenModal: () => void;
  onSaveNow: () => void;
}

export const LocalFileStatusWidget: React.FC<LocalFileStatusWidgetProps> = ({
  fileName,
  status,
  lastSavedAt,
  isSupported,
  onOpenFile,
  onCreateNewFile,
  onRequestPermission,
  onOpenModal,
  onSaveNow,
}) => {
  // 1. 非対応ブラウザ
  if (!isSupported) {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
        title="ブラウザがFile System Access API非対応のため手動保存モードです"
      >
        <Save className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-bold">手動保存モード</span>
      </button>
    );
  }

  // 2. ファイル未選択時: 開く / 新規作成 のクイックボタン
  if (status === 'no_file' || !fileName) {
    return (
      <div className="inline-flex items-center space-x-1 bg-amber-50/90 border border-amber-300 rounded-lg p-0.5 text-xs shadow-2xs">
        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex items-center space-x-1 px-2 py-0.5 text-amber-900 hover:text-amber-950 font-bold transition-colors cursor-pointer"
          title="PCローカルの保存先ファイル（data.jsonなど）を選択してください"
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">保存先ファイル: </span>
          <span className="underline decoration-amber-400">未選択</span>
        </button>

        <button
          type="button"
          onClick={onOpenFile}
          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-bold transition-all shadow-2xs cursor-pointer"
          title="PC上の既存JSONファイルを開く"
        >
          <FolderOpen className="w-3 h-3 text-blue-600" />
          <span>開く</span>
        </button>

        <button
          type="button"
          onClick={onCreateNewFile}
          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition-all shadow-2xs cursor-pointer"
          title="新しいJSONファイルをPC上に作成して自動保存を開始"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">新規作成</span>
        </button>
      </div>
    );
  }

  // 3. パーミッション許可が必要な場合（再読み込み後など）
  if (status === 'permission_needed') {
    return (
      <div className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 text-xs shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="text-amber-900 font-bold truncate max-w-[120px] sm:max-w-[160px]" title={fileName}>
          {fileName}
        </span>
        <button
          type="button"
          onClick={onRequestPermission}
          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-2xs cursor-pointer transition-colors"
          title="クリックしてファイルへのアクセス許可を再確認してください"
        >
          <span>再接続を許可</span>
        </button>
      </div>
    );
  }

  // 4. ファイルが接続されている場合（保存済み / 保存中 / 未保存 / エラー）
  return (
    <div className="inline-flex items-center space-x-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg p-0.5 text-xs transition-colors shadow-2xs">
      <button
        type="button"
        onClick={onOpenModal}
        className="inline-flex items-center space-x-1.5 px-2 py-0.5 text-slate-800 hover:text-blue-700 transition-colors cursor-pointer group"
        title={`ファイル: ${fileName}\nクリックしてファイル管理画面を開く`}
      >
        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="font-bold truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
          {fileName}
        </span>

        {/* Status Indicator */}
        {status === 'saving' && (
          <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span className="hidden sm:inline">保存中...</span>
          </span>
        )}

        {status === 'saved' && (
          <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>保存済</span>
            {lastSavedAt && (
              <span className="text-slate-400 font-normal hidden lg:inline ml-0.5">
                {lastSavedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
        )}

        {status === 'unsaved' && (
          <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="hidden sm:inline">未保存</span>
          </span>
        )}

        {status === 'error' && (
          <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
            <span>エラー</span>
          </span>
        )}

        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
      </button>

      {/* Quick Action: Save Now if unsaved */}
      {status === 'unsaved' && (
        <button
          type="button"
          onClick={onSaveNow}
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
          title="今すぐ上書き保存"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
