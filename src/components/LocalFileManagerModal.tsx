import React, { useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Plus,
  Save,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  HardDrive,
  ShieldCheck,
  Unlink,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { FileSaveStatus, AppDataFile } from '../types';

interface LocalFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string | null;
  status: FileSaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  isSupported: boolean;
  onOpenFile: () => void;
  onCreateNewFile: () => void;
  onSaveAsNewFile: () => void;
  onRequestPermission: () => void;
  onDisconnectFile: () => void;
  onSaveNow: () => void;
  onExportDownload: () => void;
  onImportFile: (file: File) => void;
}

export const LocalFileManagerModal: React.FC<LocalFileManagerModalProps> = ({
  isOpen,
  onClose,
  fileName,
  status,
  lastSavedAt,
  errorMessage,
  isSupported,
  onOpenFile,
  onCreateNewFile,
  onSaveAsNewFile,
  onRequestPermission,
  onDisconnectFile,
  onSaveNow,
  onExportDownload,
  onImportFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getStatusBadge = () => {
    switch (status) {
      case 'saved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PCローカルファイルへ保存済み</span>
          </span>
        );
      case 'saving':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>ファイルへ書き込み中...</span>
          </span>
        );
      case 'unsaved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>未保存の変更あり (自動保存待機中)</span>
          </span>
        );
      case 'permission_needed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>アクセス権限の再確認が必要です</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>保存エラー</span>
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>手動保存モード（ブラウザ非対応）</span>
          </span>
        );
      case 'no_file':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>PCローカルファイル未選択（一時メモリ保存中）</span>
          </span>
        );
    }
  };

  const handleManualImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportFile(file);
    e.target.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">PCローカルファイル直接保存設定</h2>
              <p className="text-[11px] text-slate-500">File System Access API & ローカルファイル管理</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Current File Status Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>現在の保存先ファイル</span>
              </span>
              {getStatusBadge()}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900 font-mono flex items-center space-x-2">
                  <span>📄</span>
                  <span className="break-all">{fileName || '（ファイル未選択）'}</span>
                </div>
                {fileName && (
                  <button
                    type="button"
                    onClick={onDisconnectFile}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    title="現在のファイルとの接続を解除"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>切断</span>
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>
                  最終同期:{' '}
                  {lastSavedAt
                    ? `${lastSavedAt.toLocaleDateString('ja-JP')} ${lastSavedAt.toLocaleTimeString('ja-JP')}`
                    : '未保存'}
                </span>
                {fileName && status !== 'saving' && (
                  <button
                    type="button"
                    onClick={onSaveNow}
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>今すぐ上書き保存</span>
                  </button>
                )}
              </div>
            </div>

            {/* Permission Needed Alert Banner */}
            {status === 'permission_needed' && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ファイル「{fileName}」へのアクセス許可が必要です</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  ブラウザのセキュリティ仕様により、再読み込み後はユーザー操作によるファイルアクセス確認が必要です。
                  下のボタンを押して、ブラウザの許可ダイアログで「変更の保存を許可」を選択してください。
                </p>
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>アクセスを許可して同期を再開する</span>
                </button>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-900 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">エラーが発生しました</div>
                  <div className="text-[11px] text-rose-800">{errorMessage}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700">ファイル操作</h3>

            {isSupported ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenFile();
                    onClose();
                  }}
                  className="flex items-center space-x-2 p-3 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">既存ファイルを開く</div>
                    <div className="text-[10px] text-slate-500">PC上のJSONデータを選択して読込</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCreateNewFile();
                    onClose();
                  }}
                  className="flex items-center space-x-2 p-3 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">新規ファイルを作成</div>
                    <div className="text-[10px] text-slate-500">保存先PCファイルを新規作成</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSaveAsNewFile();
                    onClose();
                  }}
                  className="flex items-center space-x-2 p-3 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                    <Save className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">名前を付けて保存</div>
                    <div className="text-[10px] text-slate-500">別ファイルに複製・バックアップ</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSaveNow();
                  }}
                  className="flex items-center space-x-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">今すぐ上書き保存</div>
                    <div className="text-[10px] text-slate-500">オートセーブを待たず即時実行</div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>File System Access API 非対応ブラウザです</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Safariや一部のモバイルブラウザ等では、PCローカルファイルの直接上書きがサポートされていません。
                  下の「手動エクスポート / インポート」をご利用いただくか、Google ChromeまたはMicrosoft Edgeをご利用ください。
                </p>
              </div>
            )}
          </div>

          {/* Fallback / Manual Backup Section */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <span>手動バックアップ・復元（フォールバック）</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onExportDownload();
                  onClose();
                }}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>JSONファイルとしてダウンロード</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>JSONファイルを選択して復元</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleManualImport}
              />
            </div>
          </div>

          {/* Safety & Local Storage Guide */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-blue-900 text-[11px] space-y-2">
            <div className="font-bold flex items-center space-x-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>データ保存の仕様と安全性</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-blue-800 leading-relaxed">
              <li>
                <strong>オートセーブ:</strong> 物件の登録・編集、決算期の変更などを行うと、約0.8秒後に指定したPCローカルファイルへ自動で上書き保存されます。
              </li>
              <li>
                <strong>二重バックアップ:</strong> ファイル保存と並行してブラウザのローカルキャッシュにも常時ミラーリングされるため、万が一の切断時でもデータは失われません。
              </li>
              <li>
                <strong>PCローカル完結:</strong> 外部サーバーやクラウドへデータが送信されることは一切なく、指定したPC上のファイル内で安全に管理されます。
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
