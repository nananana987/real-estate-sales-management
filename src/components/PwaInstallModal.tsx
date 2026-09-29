import React from 'react';
import {
  Download,
  CheckCircle,
  Wifi,
  WifiOff,
  Laptop,
  Smartphone,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { BeforeInstallPromptEvent } from '../utils/pwa';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  isInIframe?: boolean;
  onOpenInNewTab?: () => void;
  onInstall: () => Promise<boolean>;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isStandalone,
  isOnline,
  isInIframe = false,
  onOpenInNewTab,
  onInstall,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-white text-slate-900 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight text-slate-900">
                PWA（デスクトップ・スマホアプリ化）とオフライン機能
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs text-slate-700 bg-slate-50/50">
          {/* Iframe Warning (Crucial for AI Studio shared links) */}
          {isInIframe && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-lg space-y-2">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900 text-xs">
                    重要：Google AI Studioのプレビュー枠内で開かれています
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    現在、Google AI Studioのフレーム（共有画面）の中に表示されています。この状態でブラウザの「インストール」を実行すると、本システムではなく<strong>『Google AI Studio』が端末にインストールされてしまいます。</strong>
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    必ず下のボタンから<strong>【別タブで直接開く】</strong>を押して、AI Studioの枠を外した単体URLを表示してからインストールを行ってください。
                  </p>
                </div>
              </div>
              {onOpenInNewTab && (
                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={onOpenInNewTab}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>別タブで直接アプリを開く（PWA用）</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Current Status Box */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900">現在の稼働モード</span>
              {isStandalone ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle className="w-3 h-3" />
                  <span>PWAアプリモードで起動中</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Laptop className="w-3 h-3" />
                  <span>ブラウザタブで閲覧中</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">ネットワーク接続状態:</span>
              <span className="inline-flex items-center space-x-1 font-semibold">
                {isOnline ? (
                  <span className="text-emerald-700 flex items-center space-x-1">
                    <Wifi className="w-3 h-3" />
                    <span>オンライン（接続中）</span>
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center space-x-1">
                    <WifiOff className="w-3 h-3" />
                    <span>オフライン（完全ローカル動作）</span>
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">オフラインキャッシュ（Service Worker）:</span>
              <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                <CheckCircle className="w-3 h-3" />
                <span>キャッシュ有効・完全オフライン対応済</span>
              </span>
            </div>
          </div>

          {/* Quick Install Action if available */}
          {isInstallable && !isStandalone && !isInIframe && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-blue-900 text-xs">ワンクリックでインストール可能です</div>
                <div className="text-[11px] text-blue-700">
                  デスクトップやスタートメニューに専用アイコンが作成されます。
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>今すぐインストール</span>
              </button>
            </div>
          )}

          {/* Benefits of PWA */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>PWA（インストール）の特長・メリット</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-start space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800">ワンクリック即起動:</strong> デスクトップやスマホのホーム画面に専用アプリアイコンが作成されます。
                </span>
              </li>
              <li className="flex items-start space-x-1.5">
                <WifiOff className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800">完全オフライン対応:</strong> 通信環境がなくても起動し、仕入・売上・原価の計算や管理が継続できます。
                </span>
              </li>
              <li className="flex items-start space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800">ローカル保存の安全性:</strong> 入力データは端末内の安全な保存領域（LocalStorage / IndexedDB）に保持されます。
                </span>
              </li>
            </ul>
          </div>

          {/* Manual Install Instructions for Browser */}
          {!isStandalone && (
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <Laptop className="w-3.5 h-3.5 text-slate-700" />
                <span>ブラウザからの手動インストール手順（単体タブ時）</span>
              </h4>
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="font-bold text-slate-800">Google Chrome / Microsoft Edge（PC）:</div>
                  <p className="mt-0.5 text-slate-600">
                    アドレスバーの右端にある <strong>「インストール」アイコン（パソコン画面に下矢印）</strong> をクリック、または右上メニュー（︙）の「保存して共有」→「不動産原価管理をインストール」を選択します。
                  </p>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <Smartphone className="w-3 h-3" />
                    <span>iPhone / iPad (Safari):</span>
                  </div>
                  <p className="mt-0.5 text-slate-600">
                    画面下の共有ボタン（四角から上矢印）をタップし、メニューから <strong>「ホーム画面に追加」</strong> を選択します。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
