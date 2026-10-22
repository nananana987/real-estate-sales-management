import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  FileText,
  ArrowRight,
  Info,
  HelpCircle,
  Building2,
  Receipt,
  Link2,
  TrendingUp,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  parsePropertiesCsv,
  convertCsvRowsToProperties,
  downloadPropertyCsvTemplate,
  ParsedCsvPropertyRow,
  PROPERTY_CSV_TEMPLATE_HEADERS,
  parseIncidentalCostsCsv,
  downloadIncidentalCostCsvTemplate,
  ParsedCsvIncidentalCostRow,
  INCIDENTAL_COST_CSV_TEMPLATE_HEADERS,
  applyIncidentalCostsToProperties,
  parseSalesCsv,
  downloadSaleCsvTemplate,
  ParsedCsvSaleRow,
  SALE_CSV_TEMPLATE_HEADERS,
  applySalesToProperties,
  detectCsvType,
} from '../utils/csvHelper';
import { formatCurrency } from '../utils/calculations';
import { ResizableModal } from './ResizableModal';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProperties: Property[];
  currentFY: FiscalYear;
  onImport: (properties: Property[], mode: 'append' | 'replace' | 'direct_update') => void;
}

type ImportTargetType = 'properties' | 'incidental_costs' | 'sales';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingProperties,
  currentFY,
  onImport,
}) => {
  const [targetType, setTargetType] = useState<ImportTargetType>('properties');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [encoding, setEncoding] = useState<'UTF-8' | 'Shift_JIS'>('UTF-8');
  const [showColumnGuide, setShowColumnGuide] = useState(false);

  // Parsed state for Properties
  const [parsedPropData, setParsedPropData] = useState<{
    rows: ParsedCsvPropertyRow[];
    validProperties: Property[];
    totalCount: number;
    validCount: number;
    errorCount: number;
  } | null>(null);

  // Parsed state for Incidental Costs
  const [parsedCostData, setParsedCostData] = useState<{
    rows: ParsedCsvIncidentalCostRow[];
    validRows: ParsedCsvIncidentalCostRow[];
    totalCount: number;
    validCount: number;
    errorCount: number;
    totalAmount: number;
  } | null>(null);

  // Parsed state for Sales
  const [parsedSaleData, setParsedSaleData] = useState<{
    headers: string[];
    rows: ParsedCsvSaleRow[];
    validRows: ParsedCsvSaleRow[];
    hasHeaderRow: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const runParse = (text: string, type: ImportTargetType) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedPropData(null);
      setParsedCostData(null);
      setParsedSaleData(null);
      return;
    }

    if (type === 'properties') {
      const result = parsePropertiesCsv(text, existingProperties);
      const validRows = result.rows.filter(r => r.isValid);
      const validProperties = convertCsvRowsToProperties(validRows, currentFY.id);
      setParsedPropData({
        ...result,
        validProperties,
      });
      setParsedCostData(null);
      setParsedSaleData(null);
    } else if (type === 'incidental_costs') {
      const result = parseIncidentalCostsCsv(text, existingProperties);
      const validRows = result.rows.filter(r => r.isValid);
      setParsedCostData({
        ...result,
        validRows,
      });
      setParsedPropData(null);
      setParsedSaleData(null);
    } else {
      const result = parseSalesCsv(text, existingProperties);
      setParsedSaleData(result);
      setParsedPropData(null);
      setParsedCostData(null);
    }
  };

  const handleSwitchTargetType = (newType: ImportTargetType) => {
    setTargetType(newType);
    setImportMode('append');
    if (csvText.trim()) {
      runParse(csvText, newType);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileWithEncoding(file, encoding);
    e.target.value = '';
  };

  const readFileWithEncoding = (file: File, enc: 'UTF-8' | 'Shift_JIS') => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = (event.target?.result as string) || '';
      // 文字化け検知（UTF-8で読んで置換文字が含まれる場合はShift_JISで自動再試行）
      if (enc === 'UTF-8' && text.includes('\uFFFD')) {
        setEncoding('Shift_JIS');
        readFileWithEncoding(file, 'Shift_JIS');
        return;
      }

      // CSVヘッダーから「物件」「付随費用」「売上」を自動判定してタブ切替
      const detected = detectCsvType(text);
      setTargetType(detected);
      runParse(text, detected);
    };
    reader.readAsText(file, enc);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileWithEncoding(file, encoding);
    }
  };

  const handleClear = () => {
    setCsvText('');
    setFileName(null);
    setParsedPropData(null);
    setParsedCostData(null);
    setParsedSaleData(null);
  };

  const handleExecuteImport = () => {
    if (targetType === 'properties') {
      if (!parsedPropData || parsedPropData.validProperties.length === 0) return;

      if (importMode === 'replace') {
        const ok = window.confirm(
          `【上書き確認】\n現在登録されている全物件データを消去し、今回のCSVデータ（${parsedPropData.validProperties.length}件）で完全に置き換えますか？`
        );
        if (!ok) return;
      }

      onImport(parsedPropData.validProperties, importMode);
      handleClear();
      onClose();
    } else if (targetType === 'incidental_costs') {
      if (!parsedCostData || parsedCostData.validRows.length === 0) return;

      const { updatedProperties, appliedCount, affectedPropertiesCount } =
        applyIncidentalCostsToProperties(
          existingProperties,
          parsedCostData.validRows,
          importMode
        );

      if (importMode === 'replace') {
        const ok = window.confirm(
          `【上書き確認】\n対象物件（${affectedPropertiesCount}物件）の既存の付随費用明細をクリアし、今回のCSVの付随費用（${appliedCount}件）で置き換えますか？`
        );
        if (!ok) return;
      }

      onImport(updatedProperties, 'direct_update');
      alert(
        `${affectedPropertiesCount}件の物件に対して、計${appliedCount}件の付随費用データを一括登録しました。`
      );
      handleClear();
      onClose();
    } else {
      // 売上データ一括取込
      if (!parsedSaleData || parsedSaleData.validRows.length === 0) return;

      const { updatedProperties, appliedCount, affectedPropertiesCount } =
        applySalesToProperties(
          existingProperties,
          parsedSaleData.validRows,
          importMode
        );

      if (importMode === 'replace') {
        const ok = window.confirm(
          `【上書き確認】\n対象物件（${affectedPropertiesCount}物件）の既存の売上レコードをクリアし、今回のCSVの売上データ（${appliedCount}件）で置き換えますか？`
        );
        if (!ok) return;
      }

      onImport(updatedProperties, 'direct_update');
      alert(
        `${affectedPropertiesCount}件の物件に対して、計${appliedCount}件の売上データを一括登録しました。`
      );
      handleClear();
      onClose();
    }
  };

  // 統計集計
  const errorRowCount =
    targetType === 'properties'
      ? parsedPropData?.rows.filter(r => r.errors.length > 0).length || 0
      : targetType === 'incidental_costs'
      ? parsedCostData?.rows.filter(r => r.errors.length > 0).length || 0
      : parsedSaleData?.rows.filter(r => r.errors.length > 0).length || 0;

  const warningRowCount =
    targetType === 'properties'
      ? parsedPropData?.rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length || 0
      : targetType === 'incidental_costs'
      ? parsedCostData?.rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length || 0
      : parsedSaleData?.rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length || 0;

  const validCount =
    targetType === 'properties'
      ? parsedPropData?.validProperties.length || 0
      : targetType === 'incidental_costs'
      ? parsedCostData?.validRows.length || 0
      : parsedSaleData?.validRows.length || 0;

  const totalRowCount =
    targetType === 'properties'
      ? parsedPropData?.rows.length || 0
      : targetType === 'incidental_costs'
      ? parsedCostData?.rows.length || 0
      : parsedSaleData?.rows.length || 0;

  const hasAnyParsedData =
    (targetType === 'properties' && parsedPropData && parsedPropData.rows.length > 0) ||
    (targetType === 'incidental_costs' && parsedCostData && parsedCostData.rows.length > 0) ||
    (targetType === 'sales' && parsedSaleData && parsedSaleData.rows.length > 0);

  return (
    <ResizableModal
      defaultWidth={1024}
      minWidth={560}
      minHeight={420}
      storageKey="csv_import_modal"
      onBackdropClick={onClose}
    >
      {({ renderHeaderControls }) => (
        <>
          {/* Modal Header */}
          <div className="px-4 py-3 bg-[#001529] text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-400/30">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                  <span>CSV一括データ取込 (インポート)</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded">
                    対象年度: 第{currentFY.periodNumber}期
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  Excel等で作成した「物件台帳CSV」「付随費用CSV」「売上データCSV」を読み込み、一括登録・物件紐付けを行います
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {renderHeaderControls('dark')}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Target Type Switcher Tabs */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex space-x-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSwitchTargetType('properties')}
                className={`px-3.5 py-2 rounded-t-lg text-xs font-bold flex items-center space-x-1.5 border-t border-l border-r transition-all cursor-pointer ${
                  targetType === 'properties'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                    : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>1. 物件・仕入データ一括取込</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTargetType('incidental_costs')}
                className={`px-3.5 py-2 rounded-t-lg text-xs font-bold flex items-center space-x-1.5 border-t border-l border-r transition-all cursor-pointer ${
                  targetType === 'incidental_costs'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                    : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>2. 付随費用データ一括取込</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTargetType('sales')}
                className={`px-3.5 py-2 rounded-t-lg text-xs font-bold flex items-center space-x-1.5 border-t border-l border-r transition-all cursor-pointer ${
                  targetType === 'sales'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                    : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. 売上データ一括取込 (売却契約・決済)</span>
              </button>
            </div>

            <div className="pb-1.5 text-[11px] text-slate-500 hidden md:flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>※CSVの1行目ヘッダーから自動で取込種別も判定されます</span>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {/* Step 1: Template Download & Column Guide */}
            <div
              className={`bg-white p-3.5 rounded-lg border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                targetType === 'properties'
                  ? 'border-blue-200'
                  : targetType === 'incidental_costs'
                  ? 'border-amber-200'
                  : 'border-emerald-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <Info
                    className={`w-4 h-4 ${
                      targetType === 'properties'
                        ? 'text-blue-600'
                        : targetType === 'incidental_costs'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  />
                  <h3 className="text-xs font-bold text-slate-800">
                    {targetType === 'properties'
                      ? 'ステップ1: 物件データ取込用CSVファイルを用意する'
                      : targetType === 'incidental_costs'
                      ? 'ステップ1: 付随費用データ取込用CSVファイルを用意する (管理コードまたは所在地で物件に自動紐付け)'
                      : 'ステップ1: 売上データ取込用CSVファイルを用意する (管理コードまたは所在地で物件に自動紐付け)'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  {targetType === 'properties'
                    ? '専用テンプレートをダウンロードしてExcel等で編集するか、お手元の物件一覧CSVをそのまま読み込めます。'
                    : targetType === 'incidental_costs'
                    ? '「管理コード（例: 25001）」または「物件所在地」を指定すると、該当する登録済み物件の付随費用として一括追加されます。'
                    : '「管理コード（例: 25001）」または「物件所在地」を指定すると、該当物件の売上レコード（全部売却・一部売却）として一括登録されます。計上売上原価が空欄の場合は物件の総仕入原価または面積按分から自動計算されます。'}
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowColumnGuide(!showColumnGuide)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>列の対応表を{showColumnGuide ? '閉じる' : '見る'}</span>
                </button>

                {targetType === 'properties' ? (
                  <button
                    type="button"
                    onClick={downloadPropertyCsvTemplate}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>物件CSVテンプレートDL</span>
                  </button>
                ) : targetType === 'incidental_costs' ? (
                  <button
                    type="button"
                    onClick={() => downloadIncidentalCostCsvTemplate(existingProperties)}
                    className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>付随費用CSVテンプレートDL</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadSaleCsvTemplate(existingProperties)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>売上CSVテンプレートDL</span>
                  </button>
                )}
              </div>
            </div>

            {/* Column Guide Collapsible */}
            {showColumnGuide && (
              <div className="bg-slate-800 text-slate-100 p-3.5 rounded-lg text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">
                    {targetType === 'properties'
                      ? '■ 物件CSV 標準列定義（1行目にヘッダーがある場合は列名から自動マッピングします）'
                      : targetType === 'incidental_costs'
                      ? '■ 付随費用CSV 標準列定義（管理コードまたは物件所在地で既存物件に紐付けます）'
                      : '■ 売上CSV 標準列定義（管理コードまたは物件所在地で既存物件に紐付けます）'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowColumnGuide(false)}
                    className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                  >
                    閉じる ×
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(targetType === 'properties'
                    ? PROPERTY_CSV_TEMPLATE_HEADERS
                    : targetType === 'incidental_costs'
                    ? INCIDENTAL_COST_CSV_TEMPLATE_HEADERS
                    : SALE_CSV_TEMPLATE_HEADERS
                  ).map((h, i) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 bg-slate-700 rounded border border-slate-600 text-[11px] font-mono"
                    >
                      {i + 1}. {h}
                      {targetType === 'properties' && h === '物件所在地' && (
                        <strong className="text-rose-400 ml-1">*必須</strong>
                      )}
                      {targetType !== 'properties' &&
                        (h === '管理コード' || h === '物件所在地') && (
                          <strong className="text-amber-300 ml-1">*いずれか必須</strong>
                        )}
                    </span>
                  ))}
                </div>
                {targetType === 'properties' ? (
                  <p className="text-[11px] text-slate-300 pt-1">
                    ※「管理コード」が空欄の行は自動で連番（例: 26001〜）を採番します。日付は{' '}
                    <code>2025-05-10</code> や <code>2025/5/10</code> 形式に対応しています。
                  </p>
                ) : targetType === 'incidental_costs' ? (
                  <p className="text-[11px] text-slate-300 pt-1">
                    ※「費用区分」には 造成費用 / 登記費用 / 仲介手数料 / 解体費用 / 測量費用 / 印紙税 /
                    水道加入金・分担金 / 設計・地盤調査費用 / 修繕・リフォーム費用 / その他（任意の科目名も可）を指定できます。支払日は空欄（未払状態）でも登録でき、金額はマイナス値（返金・値引き等）にも対応しています。
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-300 pt-1">
                    ※「売却形態」には <code>全部売却</code> または <code>一部売却</code> を指定できます（未入力時は区画名の有無で自動判定）。「計上売上原価」が空欄の場合、全部売却なら未計上原価の全額、一部売却なら売却土地面積÷全体土地面積の面積按分で自動計算されます。
                  </p>
                )}
              </div>
            )}

            {/* Step 2: File Upload or Text Paste */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* File Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group min-h-[150px]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 flex items-center justify-center mb-2 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  クリックしてCSVファイルを選択、またはドラッグ＆ドロップ
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  UTF-8 / Shift_JIS (Excel出力CSV) 自動判別対応
                </p>
                {fileName && (
                  <div className="mt-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] font-bold text-emerald-700 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>選択中: {fileName}</span>
                  </div>
                )}
              </div>

              {/* Direct Textarea Paste */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    またはCSVテキスト・Excelコピーを直接貼り付け
                  </label>
                  {csvText && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[11px] text-red-600 hover:text-red-700 flex items-center space-x-0.5 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>クリア</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={csvText}
                  onChange={e => {
                    setFileName(null);
                    runParse(e.target.value, targetType);
                  }}
                  placeholder={
                    targetType === 'properties'
                      ? '管理コード,物件所在地,種類,地目,土地面積_㎡...\n25001,東京都世田谷区成城...,土地＋建物,宅地,120.5,...'
                      : targetType === 'incidental_costs'
                      ? '管理コード,物件所在地,費用区分,相手先_支払先,支払日,金額_税込,備考メモ\n25001,東京都世田谷区...,測量費用,〇〇測量設計,2025-05-20,385000,確定測量費'
                      : '管理コード,物件所在地,売却形態,区画・号地名,買主名_売上先,買主住所,売上契約日,売上決済日,手付金額,手付金受領日,売却土地面積_㎡,売却建物面積_㎡,土地売上金額_非課税,建物売上金額_税込...\n25001,東京都世田谷区...,全部売却,,鈴木 一郎,東京都...,2025-10-15,2025-11-28,3000000,2025-10-15,120.5,95.2,35000000,18000000...'
                  }
                  className="w-full flex-1 min-h-[105px] p-2 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                />
              </div>
            </div>

            {/* Step 3: Preview Table */}
            {hasAnyParsedData && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden space-y-0">
                {/* Summary Bar */}
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-800">
                      取込プレビュー ({totalRowCount}行検出)
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>取込可能: {validCount}件</span>
                    </span>
                    {warningRowCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>自動補完あり: {warningRowCount}件</span>
                      </span>
                    )}
                    {errorRowCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>エラー除外: {errorRowCount}件</span>
                      </span>
                    )}
                  </div>

                  {/* Import Mode Selector */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-600 font-semibold">取込方法:</span>
                    <label className="inline-flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-blue-600"
                      />
                      <span className="font-bold text-slate-800">
                        {targetType === 'properties'
                          ? `既存物件に追加 (${existingProperties.length}件 + ${validCount}件)`
                          : targetType === 'incidental_costs'
                          ? '対象物件の既存付随費用に追加 (推奨)'
                          : '対象物件の既存売上データに追加 (推奨)'}
                      </span>
                    </label>
                    <label className="inline-flex items-center space-x-1 cursor-pointer ml-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-rose-600"
                      />
                      <span className="font-semibold text-rose-700">
                        {targetType === 'properties'
                          ? '全件上書き置換'
                          : targetType === 'incidental_costs'
                          ? '対象物件の付随費用を上書き置換'
                          : '対象物件の売上データを上書き置換'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Preview Table: 1. Properties */}
                {targetType === 'properties' && parsedPropData && (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 w-12 text-center">CSV行</th>
                          <th className="py-2 px-2.5 w-24">判定</th>
                          <th className="py-2 px-2.5 w-20">管理コード</th>
                          <th className="py-2 px-2.5 min-w-[160px]">物件所在地</th>
                          <th className="py-2 px-2.5 w-24">種類 / 地目</th>
                          <th className="py-2 px-2.5 w-24 text-right">面積(㎡)</th>
                          <th className="py-2 px-2.5 w-28">売主(仕入先)</th>
                          <th className="py-2 px-2.5 w-24">契約日/決済日</th>
                          <th className="py-2 px-2.5 w-28 text-right">土地仕入</th>
                          <th className="py-2 px-2.5 w-28 text-right">建物仕入</th>
                          <th className="py-2 px-2.5 w-24 text-right">固都税精算</th>
                          <th className="py-2 px-2.5 min-w-[160px]">メッセージ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPropData.rows.map(row => {
                          const hasError = row.errors.length > 0;
                          const hasWarning = !hasError && row.warnings.length > 0;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={
                                hasError
                                  ? 'bg-rose-50/70 text-rose-900'
                                  : hasWarning
                                  ? 'bg-amber-50/40'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">
                                {row.rowIndex}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {hasError ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>除外</span>
                                  </span>
                                ) : hasWarning ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>補完OK</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>OK</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-blue-700">
                                {row.code}
                              </td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                {row.location || <span className="text-rose-500">(未入力)</span>}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-600">
                                {row.propertyType === 'land'
                                  ? '土地'
                                  : row.propertyType === 'building'
                                  ? '建物'
                                  : '土地＋建物'}{' '}
                                / {row.landCategory}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono">
                                <div>土: {row.landArea || 0}</div>
                                {(row.buildingArea || 0) > 0 && (
                                  <div className="text-slate-500">建: {row.buildingArea}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 truncate max-w-[120px]">
                                {row.sellerName || '-'}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">
                                <div>契: {row.contractDate}</div>
                                {row.settlementDate && (
                                  <div className="text-emerald-700">決: {row.settlementDate}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-semibold">
                                {formatCurrency(row.landPurchasePrice)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-semibold">
                                {formatCurrency(row.buildingPurchasePrice)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                                {formatCurrency((row.fixedAssetTaxLand || 0) + (row.fixedAssetTaxBuilding || 0))}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px]">
                                {row.errors.map((err, i) => (
                                  <div key={i} className="text-rose-600 font-bold">
                                    ・{err}
                                  </div>
                                ))}
                                {row.warnings.map((w, i) => (
                                  <div key={i} className="text-amber-700">
                                    ・{w}
                                  </div>
                                ))}
                                {!hasError && !hasWarning && (
                                  <span className="text-slate-400">問題なし</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Preview Table: 2. Incidental Costs */}
                {targetType === 'incidental_costs' && parsedCostData && (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 w-12 text-center">CSV行</th>
                          <th className="py-2 px-2.5 w-24">判定</th>
                          <th className="py-2 px-2.5 min-w-[200px]">紐付け対象物件</th>
                          <th className="py-2 px-2.5 w-36">費用区分 (科目)</th>
                          <th className="py-2 px-2.5 min-w-[140px]">相手先・支払先</th>
                          <th className="py-2 px-2.5 w-28">支払日</th>
                          <th className="py-2 px-2.5 w-32 text-right">金額(税込)</th>
                          <th className="py-2 px-2.5 min-w-[140px]">備考メモ</th>
                          <th className="py-2 px-2.5 min-w-[160px]">メッセージ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCostData.rows.map(row => {
                          const hasError = row.errors.length > 0;
                          const hasWarning = !hasError && row.warnings.length > 0;
                          const matched = row.matchedProperty;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={
                                hasError
                                  ? 'bg-rose-50/70 text-rose-900'
                                  : hasWarning
                                  ? 'bg-amber-50/40'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">
                                {row.rowIndex}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {hasError ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>除外</span>
                                  </span>
                                ) : hasWarning ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>補完OK</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>紐付OK</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {matched ? (
                                  <div className="flex items-center space-x-1.5">
                                    <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                      {matched.code}
                                    </span>
                                    <span className="font-bold text-slate-800 truncate max-w-[160px]">
                                      {matched.location}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-rose-600 font-bold">
                                    未一致 ({row.code || row.locationHint || '指定なし'})
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px]">
                                  {row.costType}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-700 font-medium">
                                {row.payee}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-600">
                                {row.paymentDate ? (
                                  row.paymentDate
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-bold text-[10px]">
                                    未払(空欄)
                                  </span>
                                )}
                              </td>
                              <td
                                className={`py-1.5 px-2.5 text-right font-mono font-bold ${
                                  row.amount < 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {formatCurrency(row.amount)}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-500 truncate max-w-[140px]">
                                {row.memo || '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px]">
                                {row.errors.map((err, i) => (
                                  <div key={i} className="text-rose-600 font-bold">
                                    ・{err}
                                  </div>
                                ))}
                                {row.warnings.map((w, i) => (
                                  <div key={i} className="text-amber-700">
                                    ・{w}
                                  </div>
                                ))}
                                {!hasError && !hasWarning && (
                                  <span className="text-slate-400">問題なし</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Preview Table: 3. Sales */}
                {targetType === 'sales' && parsedSaleData && (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 w-12 text-center">CSV行</th>
                          <th className="py-2 px-2.5 w-24">判定</th>
                          <th className="py-2 px-2.5 min-w-[190px]">紐付け対象物件</th>
                          <th className="py-2 px-2.5 w-28">売却形態/区画</th>
                          <th className="py-2 px-2.5 min-w-[120px]">買主(売上先)</th>
                          <th className="py-2 px-2.5 w-28">契約日/決済日</th>
                          <th className="py-2 px-2.5 w-24 text-right">売却面積(㎡)</th>
                          <th className="py-2 px-2.5 w-28 text-right">土地売上</th>
                          <th className="py-2 px-2.5 w-28 text-right">建物売上</th>
                          <th className="py-2 px-2.5 w-24 text-right">固都税精算</th>
                          <th className="py-2 px-2.5 w-28 text-right">計上売上原価</th>
                          <th className="py-2 px-2.5 min-w-[160px]">メッセージ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedSaleData.rows.map(row => {
                          const hasError = row.errors.length > 0;
                          const hasWarning = !hasError && row.warnings.length > 0;
                          const matched = row.matchedProperty;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={
                                hasError
                                  ? 'bg-rose-50/70 text-rose-900'
                                  : hasWarning
                                  ? 'bg-amber-50/40'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">
                                {row.rowIndex}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {hasError ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>除外</span>
                                  </span>
                                ) : hasWarning ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>補完OK</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>紐付OK</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {matched ? (
                                  <div className="flex items-center space-x-1.5">
                                    <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                      {matched.code}
                                    </span>
                                    <span className="font-bold text-slate-800 truncate max-w-[150px]">
                                      {matched.location}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-rose-600 font-bold">
                                    未一致 ({row.targetCode || row.targetLocation || '指定なし'})
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    row.saleCategory === 'full'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : 'bg-purple-50 text-purple-800 border-purple-200'
                                  }`}
                                >
                                  {row.saleCategory === 'full' ? '全部売却' : '一部売却'}
                                </span>
                                {row.partialSaleName && (
                                  <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                                    {row.partialSaleName}
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                <div>{row.buyerName}</div>
                                {row.buyerAddress && (
                                  <div className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]">
                                    {row.buyerAddress}
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">
                                <div>契: {row.contractDate}</div>
                                {row.settlementDate ? (
                                  <div className="text-emerald-700 font-bold">
                                    決: {row.settlementDate}
                                  </div>
                                ) : (
                                  <div className="text-amber-600">未決済</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono">
                                <div>土: {row.soldLandArea || 0}</div>
                                {(row.soldBuildingArea || 0) > 0 && (
                                  <div className="text-slate-500">建: {row.soldBuildingArea}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700">
                                {formatCurrency(row.landPrice)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700">
                                {formatCurrency(row.buildingPrice)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                                {formatCurrency(row.fixedAssetTaxSettlement)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-amber-800">
                                {formatCurrency(row.costOfGoodsSold || 0)}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px]">
                                {row.errors.map((err, i) => (
                                  <div key={i} className="text-rose-600 font-bold">
                                    ・{err}
                                  </div>
                                ))}
                                {row.warnings.map((w, i) => (
                                  <div key={i} className="text-amber-700">
                                    ・{w}
                                  </div>
                                ))}
                                {!hasError && !hasWarning && (
                                  <span className="text-slate-400">問題なし</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              {validCount > 0 ? (
                <span>
                  {targetType === 'properties' ? (
                    <>
                      有効な物件データ{' '}
                      <strong className="text-slate-900">{validCount}件</strong> を第
                      {currentFY.periodNumber}期へ取り込みます
                    </>
                  ) : targetType === 'incidental_costs' ? (
                    <>
                      有効な付随費用データ{' '}
                      <strong className="text-slate-900">{validCount}件</strong>{' '}
                      を各物件へ紐付けて一括登録します
                    </>
                  ) : (
                    <>
                      有効な売上データ{' '}
                      <strong className="text-slate-900">{validCount}件</strong>{' '}
                      を各物件へ紐付けて一括登録します
                    </>
                  )}
                </span>
              ) : (
                <span>CSVファイルを選択するか、テキストを貼り付けてください</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={validCount === 0}
                onClick={handleExecuteImport}
                className={`px-4 py-1.5 text-xs font-bold rounded flex items-center space-x-1.5 transition-all ${
                  validCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>
                  {targetType === 'properties'
                    ? `${validCount}件の物件を取り込む`
                    : targetType === 'incidental_costs'
                    ? `${validCount}件の付随費用を取り込む`
                    : `${validCount}件の売上データを取り込む`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </ResizableModal>
  );
};
