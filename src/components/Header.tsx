import React, { useRef } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Boxes,
  ArrowLeftRight,
  History,
  Download,
  Upload,
  RotateCcw,
  Printer,
  ChevronDown,
  Wifi,
  WifiOff,
  Laptop,
  Settings,
} from 'lucide-react';
import { FiscalYear, CompanyInfo, Property, FileSaveStatus } from '../types';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';
import { LocalFileStatusWidget } from './LocalFileStatusWidget';

interface HeaderProps {
  currentFY: FiscalYear;
  fiscalYears: FiscalYear[];
  onSelectFiscalYear: (fyId: string) => void;
  companyInfo: CompanyInfo;
  onOpenCompanyModal: () => void;
  activeTab: 'properties' | 'accounting' | 'inventory' | 'transactions' | 'rollover';
  onSelectTab: (tab: 'properties' | 'accounting' | 'inventory' | 'transactions' | 'rollover') => void;
  onOpenNewPropertyModal: () => void;
  onOpenFYModal: () => void;
  onOpenCsvImport: () => void;
  properties: Property[];
  onDataUpdated: (properties: Property[], fiscalYears: FiscalYear[], companyInfo?: CompanyInfo) => void;
  onResetData: () => void;
  isInstallable: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  isInIframe?: boolean;
  onOpenPwaModal: () => void;
  // Local File System Props
  localFileName: string | null;
  localFileStatus: FileSaveStatus;
  localFileLastSavedAt: Date | null;
  isLocalFileSupported: boolean;
  onOpenLocalFile: () => void;
  onCreateNewLocalFile: () => void;
  onRequestLocalFilePermission: () => void;
  onOpenLocalFileManagerModal: () => void;
  onSaveLocalFileNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentFY,
  fiscalYears,
  onSelectFiscalYear,
  companyInfo,
  onOpenCompanyModal,
  activeTab,
  onSelectTab,
  onOpenNewPropertyModal,
  onOpenFYModal,
  onOpenCsvImport,
  properties,
  onDataUpdated,
  onResetData,
  isInstallable,
  isStandalone,
  isOnline,
  isInIframe = false,
  onOpenPwaModal,
  localFileName,
  localFileStatus,
  localFileLastSavedAt,
  isLocalFileSupported,
  onOpenLocalFile,
  onCreateNewLocalFile,
  onRequestLocalFilePermission,
  onOpenLocalFileManagerModal,
  onSaveLocalFileNow,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importBackupJSON(
      file,
      data => {
        onDataUpdated(data.properties, data.fiscalYears, data.companyInfo);
        alert('データを正常にインポートしました。');
      },
      msg => alert(msg)
    );
    e.target.value = '';
  };

  const handleExportBackup = () => {
    exportBackupJSON(properties, fiscalYears, companyInfo);
  };

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  不動産販売・原価管理
                </h1>
                <button
                  type="button"
                  onClick={onOpenCompanyModal}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                  title="会社・顧問先情報を設定"
                >
                  <Building2 className="w-3 h-3" />
                  <span>{companyInfo.name ? companyInfo.name : '会社情報設定'}</span>
                </button>
                
                {/* PWA / Offline Status Indicator */}
                <button
                  type="button"
                  onClick={onOpenPwaModal}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    !isOnline
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : isStandalone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : isInIframe
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80'
                  }`}
                  title="PWA・オフライン設定を見る"
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="w-2.5 h-2.5 text-amber-600" />
                      <span>オフライン動作中</span>
                    </>
                  ) : isStandalone ? (
                    <>
                      <Laptop className="w-2.5 h-2.5 text-emerald-600" />
                      <span>PWAアプリ</span>
                    </>
                  ) : isInIframe ? (
                    <>
                      <Download className="w-2.5 h-2.5 text-amber-700" />
                      <span>アプリ化（PWA案内）</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-2.5 h-2.5 text-slate-600" />
                      <span>PWA・オフライン対応</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                仕入・付随費用・分筆売上・期末棚卸 & 会計科目突合
              </p>
            </div>
          </div>

          {/* Local File Storage, Fiscal Year & Global Actions */}
          <div className="flex items-center space-x-2">
            {/* PC Local File Storage Status & Action Widget */}
            <LocalFileStatusWidget
              fileName={localFileName}
              status={localFileStatus}
              lastSavedAt={localFileLastSavedAt}
              isSupported={isLocalFileSupported}
              onOpenFile={onOpenLocalFile}
              onCreateNewFile={onCreateNewLocalFile}
              onRequestPermission={onRequestLocalFilePermission}
              onOpenModal={onOpenLocalFileManagerModal}
              onSaveNow={onSaveLocalFileNow}
            />

            {/* Fiscal Year Dropdown */}
            <div className="relative inline-flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 transition-colors shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
              <select
                id="fiscal-year-select"
                aria-label="事業年度を選択"
                value={currentFY.id}
                onChange={e => onSelectFiscalYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 pr-3 py-0.5 focus:outline-hidden cursor-pointer"
              >
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id} className="bg-white text-slate-900 font-medium">
                    {fy.name} {fy.isCurrent ? '（当期）' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenFYModal}
                className="ml-1 text-[11px] text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-bold transition-all shadow-2xs cursor-pointer"
                title="年度の管理・新規作成・更新"
              >
                設定
              </button>
            </div>

            {/* PWA Install Button if available and not standalone */}
            {isInstallable && !isStandalone && (
              <button
                type="button"
                onClick={onOpenPwaModal}
                className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>アプリ化</span>
              </button>
            )}

            {/* CSV Import Button */}
            <button
              type="button"
              onClick={onOpenCsvImport}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="CSVファイルから物件データを一括取込"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">CSV取込</span>
            </button>

            {/* File & Backup Menu */}
            <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
              <button
                type="button"
                onClick={onOpenLocalFileManagerModal}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="ファイル保存・バックアップ設定"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer hidden md:inline-block"
                title="バックアップ保存 (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer hidden md:inline-block"
                title="バックアップ復元 (JSON)"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Add Property Button */}
            <button
              type="button"
              onClick={onOpenNewPropertyModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規物件</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto scrollbar-none border-t border-slate-100 pt-1">
          <button
            type="button"
            onClick={() => onSelectTab('properties')}
            className={`inline-flex items-center space-x-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-md ${
              activeTab === 'properties'
                ? 'border-blue-600 text-blue-700 bg-blue-50/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>物件一覧 & 総合収支</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('accounting')}
            className={`inline-flex items-center space-x-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-md ${
              activeTab === 'accounting'
                ? 'border-blue-600 text-blue-700 bg-blue-50/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>会計科目突合・決算照合</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold">
              照合
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className={`inline-flex items-center space-x-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-md ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>期末棚卸一覧表 (在庫原価)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('transactions')}
            className={`inline-flex items-center space-x-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-md ${
              activeTab === 'transactions'
                ? 'border-amber-600 text-amber-800 bg-amber-50/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>当期取引一覧 (仕入・売上・費用)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('rollover')}
            className={`inline-flex items-center space-x-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-md ${
              activeTab === 'rollover'
                ? 'border-purple-600 text-purple-700 bg-purple-50/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>年度更新・決算繰越</span>
          </button>
        </div>
      </div>
    </header>
  );
};

