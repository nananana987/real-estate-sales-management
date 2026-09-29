import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  RefreshCw,
  Plus,
  Building2,
  Receipt,
  Info,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  downloadPropertyCsvTemplate,
  downloadIncidentalCostCsvTemplate,
  parsePropertiesCsv,
  convertCsvRowsToProperties,
  ParsedCsvPropertyRow,
  parseIncidentalCostsCsv,
  applyIncidentalCostsToProperties,
  ParsedCsvIncidentalCostRow,
  detectCsvType,
} from '../utils/csvHelper';
import { formatCurrency } from '../utils/calculations';

type ImportTargetType = 'properties' | 'incidental_costs';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newProperties: Property[], mode: 'append' | 'replace' | 'direct_update') => void;
  existingProperties: Property[];
  currentFY: FiscalYear;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingProperties,
  currentFY,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTargetType>('properties');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string | null>(null);

  // Parsed results for properties
  const [propertyResult, setPropertyResult] = useState<{
    rows: ParsedCsvPropertyRow[];
    totalCount: number;
    validCount: number;
    errorCount: number;
  } | null>(null);

  // Parsed results for incidental costs
  const [incidentalResult, setIncidentalResult] = useState<{
    rows: ParsedCsvIncidentalCostRow[];
    totalCount: number;
    validCount: number;
    errorCount: number;
    totalAmount: number;
  } | null>(null);

  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvRawText(text);

      // 自動種別判定
      const detected = detectCsvType(text);

      if (detected === 'incidental_costs' || activeTab === 'incidental_costs') {
        setActiveTab('incidental_costs');
        const result = parseIncidentalCostsCsv(text, existingProperties);
        setIncidentalResult(result);
        setPropertyResult(null);
      } else {
        setActiveTab('properties');
        const result = parsePropertiesCsv(text, existingProperties);
        setPropertyResult(result);
        setIncidentalResult(null);
      }

      setIsProcessing(false);
    };

    reader.onerror = () => {
      alert('ファイルの読み込み中にエラーが発生しました。');
      setIsProcessing(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        alert('CSVファイル(.csv)を選択してください。');
        return;
      }
      handleFileProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setCsvRawText(null);
    setPropertyResult(null);
    setIncidentalResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTabChange = (tab: ImportTargetType) => {
    setActiveTab(tab);
    if (csvRawText) {
      if (tab === 'properties') {
        const result = parsePropertiesCsv(csvRawText, existingProperties);
        setPropertyResult(result);
        setIncidentalResult(null);
      } else {
        const result = parseIncidentalCostsCsv(csvRawText, existingProperties);
        setIncidentalResult(result);
        setPropertyResult(null);
      }
    }
  };

  const handleExecuteImport = () => {
    if (activeTab === 'properties') {
      if (!propertyResult || propertyResult.validCount === 0) {
        alert('インポート可能な有効な物件データがありません。');
        return;
      }

      const validRows = propertyResult.rows.filter(r => r.isValid);
      const converted = convertCsvRowsToProperties(validRows, currentFY.id);

      if (importMode === 'replace') {
        const confirmReplace = window.confirm(
          `【重要・確認】\n既存の物件データ（${existingProperties.length}件）を全て消去し、CSVから読み込んだ ${converted.length} 件の物件データに置き換えます。\n\nよろしいですか？`
        );
        if (!confirmReplace) return;
      }

      onImport(converted, importMode);
      alert(
        `物件CSV取込が完了しました。\n${converted.length} 件の物件データを${
          importMode === 'append' ? '追加' : '置換'
        }登録しました。`
      );
      handleClear();
      onClose();
    } else {
      // 付随費用取込
      if (!incidentalResult || incidentalResult.validCount === 0) {
        alert('インポート可能な有効な付随費用データがありません。');
        return;
      }

      const validRows = incidentalResult.rows.filter(r => r.isValid);
      const { updatedProperties, appliedCount, affectedPropertiesCount } =
        applyIncidentalCostsToProperties(existingProperties, validRows, importMode);

      if (importMode === 'replace') {
        const confirmReplace = window.confirm(
          `【確認】\n対象となる ${affectedPropertiesCount} 件の物件の既存付随費用を、今回CSVから読み込んだデータで上書き置換します。\n\nよろしいですか？`
        );
        if (!confirmReplace) return;
      }

      onImport(updatedProperties, 'direct_update');
      alert(
        `付随費用CSV取込が完了しました。\n${appliedCount} 件の付随費用を ${affectedPropertiesCount} 件の物件に${
          importMode === 'append' ? '追加' : '置換'
        }登録しました。\n（合計金額: ${formatCurrency(incidentalResult.totalAmount)}）`
      );
      handleClear();
      onClose();
    }
  };

  const currentResult = activeTab === 'properties' ? propertyResult : incidentalResult;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-[#001529] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-400/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                <span>CSVデータ一括取込 (インポート)</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30 font-mono">
                  {currentFY.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                物件情報（仕入契約）または付随費用（造成費・登記・仲介等）をCSVから一括登録します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-4 pt-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => handleTabChange('properties')}
              className={`px-4 py-2 text-xs font-bold rounded-t-md transition-colors flex items-center space-x-2 cursor-pointer border-t border-x ${
                activeTab === 'properties'
                  ? 'bg-white text-blue-900 border-slate-200 border-b-white -mb-px shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>物件データ一括取込</span>
              {propertyResult && (
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-mono">
                  {propertyResult.validCount}件
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('incidental_costs')}
              className={`px-4 py-2 text-xs font-bold rounded-t-md transition-colors flex items-center space-x-2 cursor-pointer border-t border-x ${
                activeTab === 'incidental_costs'
                  ? 'bg-white text-emerald-900 border-slate-200 border-b-white -mb-px shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>付随費用一括取込 (造成・仲介・登記等)</span>
              {incidentalResult && (
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-mono">
                  {incidentalResult.validCount}件
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-500 pb-2 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>CSVヘッダーを自動識別して種別を切り替えます</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {/* Top action bar: Template Download guide */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded ${
                  activeTab === 'properties'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {activeTab === 'properties'
                    ? '物件取込用CSVフォーマット (雛形テンプレート)'
                    : '付随費用取込用CSVフォーマット (雛形テンプレート)'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {activeTab === 'properties'
                    ? '管理コード、所在地、土地/建物仕入金額（税込）、固定資産税精算金（土地/建物税込）の列に対応。'
                    : '管理コード、物件所在地、費用区分（造成/登記/仲介/解体/測量/印紙等）、支払先、支払日、金額（税込）の列に対応。'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {activeTab === 'properties' ? (
                <button
                  type="button"
                  onClick={downloadPropertyCsvTemplate}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>物件CSV雛形DL</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => downloadIncidentalCostCsvTemplate(existingProperties)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>付随費用CSV雛形DL</span>
                </button>
              )}
            </div>
          </div>

          {/* Upload Area */}
          {!currentResult ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors bg-white ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="max-w-md mx-auto space-y-2.5">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-2xs ${
                    activeTab === 'properties'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    ここに
                    {activeTab === 'properties' ? '【物件データ】' : '【付随費用データ】'}
                    CSVファイルをドラッグ＆ドロップ
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    または <span className="text-blue-600 underline font-semibold">ファイルを選択</span> してアップロード
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-2 pt-1">
                  <span>※UTF-8 (BOM付き/なし) および Shift-JIS 形式に対応</span>
                </div>
              </div>
            </div>
          ) : (
            /* Parsed Result Preview */
            <div className="space-y-3">
              {/* File details & options */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 font-mono">
                    {fileName}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                    総件数: {currentResult.totalCount}件
                  </span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>有効: {currentResult.validCount}件</span>
                  </span>
                  {currentResult.errorCount > 0 && (
                    <span className="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>エラー: {currentResult.errorCount}件</span>
                    </span>
                  )}
                  {activeTab === 'incidental_costs' && incidentalResult && (
                    <span className="text-[11px] bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded font-bold font-mono">
                      合計金額: {formatCurrency(incidentalResult.totalAmount)}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>別のファイルを選択</span>
                  </button>
                </div>
              </div>

              {/* Import Mode Selection */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">取込モード:</span>
                  <label className="flex items-center space-x-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      {activeTab === 'properties'
                        ? '既存の物件データに追加する (推奨)'
                        : '既存の付随費用に追加する (推奨)'}
                    </span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-red-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>
                      {activeTab === 'properties'
                        ? '既存物件を全入替え (上書き置換)'
                        : '対象物件の付随費用を全入替え (上書き置換)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Table for Properties */}
              {activeTab === 'properties' && propertyResult && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">物件取込プレビュー一覧</h4>
                    <span className="text-[10px] text-slate-400">※エラー行はインポート時にスキップされます</span>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5 border-b border-slate-200">行</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">状態</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">管理コード</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">物件所在地</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">種別</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">土地面積</th>
                          <th className="py-2 px-2.5 border-b border-slate-200 text-right">土地仕入(非課税)</th>
                          <th className="py-2 px-2.5 border-b border-slate-200 text-right">建物仕入(税込)</th>
                          <th className="py-2 px-2.5 border-b border-slate-200 text-right">精算金計</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">仕入先</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {propertyResult.rows.map(row => (
                          <tr
                            key={row.rowIndex}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}
                          >
                            <td className="py-1.5 px-2.5 text-[11px] text-slate-500 font-mono">
                              {row.rowIndex}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <span>OK</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800"
                                  title={row.errors.join(', ')}
                                >
                                  <span>エラー</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">
                              {row.code}
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 max-w-xs truncate">
                              {row.location || <span className="text-red-500 font-bold">(未入力)</span>}
                              {row.warnings.length > 0 && (
                                <div className="text-[10px] text-amber-600">{row.warnings[0]}</div>
                              )}
                              {row.errors.length > 0 && (
                                <div className="text-[10px] text-red-600 font-bold">{row.errors[0]}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600">
                              {row.propertyType === 'land' ? '土地' : row.propertyType === 'building' ? '建物' : '土地建物'}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 font-mono">
                              {row.landArea ? `${row.landArea}㎡` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                              {formatCurrency(row.landPurchasePrice)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                              {formatCurrency(row.buildingPurchasePrice)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-blue-700 font-semibold">
                              {formatCurrency(row.fixedAssetTaxLand + row.fixedAssetTaxBuilding)}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 truncate max-w-[120px]">
                              {row.sellerName || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview Table for Incidental Costs */}
              {activeTab === 'incidental_costs' && incidentalResult && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">付随費用取込プレビュー一覧</h4>
                    <span className="text-[10px] text-slate-400">※エラー行（物件未紐付け・金額0円等）はスキップされます</span>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5 border-b border-slate-200">行</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">状態</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">対象物件 (管理コード/所在地)</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">費用区分</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">相手先 (支払先)</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">支払日</th>
                          <th className="py-2 px-2.5 border-b border-slate-200 text-right">金額 (税込)</th>
                          <th className="py-2 px-2.5 border-b border-slate-200">備考メモ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {incidentalResult.rows.map(row => (
                          <tr
                            key={row.rowIndex}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}
                          >
                            <td className="py-1.5 px-2.5 text-[11px] text-slate-500 font-mono">
                              {row.rowIndex}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <span>OK</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800"
                                  title={row.errors.join(', ')}
                                >
                                  <span>エラー</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 max-w-xs">
                              {row.matchedProperty ? (
                                <div>
                                  <span className="font-mono font-bold text-blue-900 mr-1.5">
                                    [{row.matchedProperty.code}]
                                  </span>
                                  <span className="text-slate-700 text-[11px] truncate">
                                    {row.matchedProperty.location}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-red-600 font-bold text-[11px]">
                                  {row.code ? `コード [${row.code}] 不一致` : '(物件未指定)'}
                                </div>
                              )}
                              {row.errors.length > 0 && (
                                <div className="text-[10px] text-red-600 font-bold">{row.errors[0]}</div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="text-[10px] text-amber-600">{row.warnings[0]}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                {row.costType}
                                {row.customCostTypeName && ` (${row.customCostTypeName})`}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 truncate max-w-[130px]">
                              {row.payee || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">
                              {row.paymentDate || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-500 truncate max-w-[140px]">
                              {row.memo || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {currentResult && currentResult.validCount > 0 ? (
              <span>
                インポート対象: <strong className="text-slate-900">{currentResult.validCount}件</strong>
                {activeTab === 'incidental_costs' && incidentalResult && (
                  <span className="ml-2 font-mono font-bold text-emerald-800">
                    (合計: {formatCurrency(incidentalResult.totalAmount)})
                  </span>
                )}
              </span>
            ) : (
              <span>CSVファイルを選択してください</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={!currentResult || currentResult.validCount === 0}
              onClick={handleExecuteImport}
              className={`px-4 py-1.5 rounded text-xs font-bold shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
                currentResult && currentResult.validCount > 0
                  ? activeTab === 'properties'
                    ? 'bg-[#001529] hover:bg-[#002244] text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {currentResult
                  ? `${currentResult.validCount}件の${activeTab === 'properties' ? '物件' : '付随費用'}を取込実行`
                  : 'インポート'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
