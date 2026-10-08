import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Edit,
  Trash2,
  Building2,
  TrendingUp,
  Percent,
  Receipt,
  Layers,
  Calendar,
  User,
  MapPin,
  LayoutList,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { Property, FiscalYear, CompanyInfo } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  formatArea,
  getPropertyTypeBadgeClass,
  isDateInFiscalYear,
  getPurchaseFixedAssetTax,
  getSaleFixedAssetTax,
  formatSellerDisplayName,
  isPropertySoldInPriorPeriod,
} from '../utils/calculations';
import { downloadCSV } from '../utils/storage';

interface SoldPropertiesViewProps {
  properties: Property[];
  fiscalYears: FiscalYear[];
  currentFY: FiscalYear;
  companyInfo?: CompanyInfo;
  onSelectProperty: (property: Property) => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
}

type SortField =
  | 'settlement_desc'
  | 'settlement_asc'
  | 'sales_desc'
  | 'profit_desc'
  | 'margin_desc'
  | 'cost_desc'
  | 'code_asc';

export const SoldPropertiesView: React.FC<SoldPropertiesViewProps> = ({
  properties,
  fiscalYears,
  currentFY,
  companyInfo,
  onSelectProperty,
  onEditProperty,
  onDeleteProperty,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFYFilter, setSelectedFYFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortField>('settlement_desc');
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // 1. 全物件の中から「売却済み（完売）」物件のみを抽出
  const allSoldProperties = useMemo(() => {
    return properties
      .map(prop => {
        const fin = calculatePropertyFinancials(prop, currentFY);
        const settledSales = (prop.sales || []).filter(s => !!s.settlementDate);
        
        // 最終売却決済日（完売引渡日）の特定
        let latestSettlementDate: string | null = null;
        settledSales.forEach(s => {
          if (s.settlementDate && (!latestSettlementDate || s.settlementDate > latestSettlementDate)) {
            latestSettlementDate = s.settlementDate;
          }
        });

        // 完売した事業年度の特定
        let soldFY: FiscalYear | undefined;
        if (latestSettlementDate) {
          soldFY = fiscalYears.find(fy => isDateInFiscalYear(latestSettlementDate, fy));
        }
        if (!soldFY && prop.fiscalYearId) {
          soldFY = fiscalYears.find(fy => fy.id === prop.fiscalYearId);
        }

        const isSoldInCurrentPeriod = latestSettlementDate
          ? isDateInFiscalYear(latestSettlementDate, currentFY)
          : false;

        // 買主名のリスト化
        const buyerNamesList = settledSales
          .map(s => s.buyerName?.trim())
          .filter(Boolean) as string[];
        const buyerNamesDisplay =
          buyerNamesList.length > 0 ? formatSellerDisplayName(buyerNamesList.join('、')) : '未登録';

        return {
          property: prop,
          fin,
          settledSales,
          latestSettlementDate,
          soldFY,
          isSoldInCurrentPeriod,
          buyerNamesDisplay,
        };
      })
      .filter(item => isPropertySoldInPriorPeriod(item.property, currentFY, fiscalYears));
  }, [properties, currentFY, fiscalYears]);

  // 2. 検索・年度・種別フィルタおよび並び替え
  const filteredProperties = useMemo(() => {
    return allSoldProperties
      .filter(item => {
        const prop = item.property;

        // フリーワード検索
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = (prop.code || '').toLowerCase().includes(q);
          const matchName = (prop.name || '').toLowerCase().includes(q);
          const matchLoc = (prop.location || '').toLowerCase().includes(q);
          const matchSeller = (prop.sellerName || '').toLowerCase().includes(q);
          const matchBuyer = item.buyerNamesDisplay.toLowerCase().includes(q);
          const matchBroker = (prop.broker || '').toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchLoc && !matchSeller && !matchBuyer && !matchBroker) {
            return false;
          }
        }

        // 年度フィルタ
        if (selectedFYFilter !== 'all') {
          if (item.soldFY?.id !== selectedFYFilter) return false;
        }

        // 種別フィルタ
        if (propertyTypeFilter !== 'all') {
          if (prop.propertyType !== propertyTypeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'settlement_desc':
            return (b.latestSettlementDate || '').localeCompare(a.latestSettlementDate || '');
          case 'settlement_asc':
            return (a.latestSettlementDate || '').localeCompare(b.latestSettlementDate || '');
          case 'sales_desc':
            return b.fin.settledSalesAmount - a.fin.settledSalesAmount;
          case 'profit_desc':
            return b.fin.grossProfit - a.fin.grossProfit;
          case 'margin_desc':
            return b.fin.grossProfitMargin - a.fin.grossProfitMargin;
          case 'cost_desc':
            return b.fin.totalAcquisitionCost - a.fin.totalAcquisitionCost;
          case 'code_asc':
          default:
            return (a.property.code || '').localeCompare(b.property.code || '', undefined, {
              numeric: true,
              sensitivity: 'base',
            });
        }
      });
  }, [allSoldProperties, searchQuery, selectedFYFilter, propertyTypeFilter, sortOption]);

  // 3. 全体統計サマリー計算
  const summary = useMemo(() => {
    const totalCount = allSoldProperties.length;

    // 現在表示されているフィルタ対象の合計
    const filteredTotalSales = filteredProperties.reduce(
      (sum, p) => sum + p.fin.settledSalesAmount,
      0
    );
    const filteredTotalCOGS = filteredProperties.reduce(
      (sum, p) => sum + p.fin.totalCostOfGoodsSold,
      0
    );
    const filteredTotalProfit = filteredProperties.reduce((sum, p) => sum + p.fin.grossProfit, 0);
    const filteredAvgMargin =
      filteredTotalSales > 0 ? (filteredTotalProfit / filteredTotalSales) * 100 : 0;

    return {
      totalCount,
      filteredTotalSales,
      filteredTotalCOGS,
      filteredTotalProfit,
      filteredAvgMargin,
    };
  }, [allSoldProperties, filteredProperties]);

  // 行展開トグル
  const toggleRow = (id: string) => {
    const next = new Set(expandedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRowIds(next);
  };

  const isAllExpanded =
    filteredProperties.length > 0 &&
    filteredProperties.every(p => expandedRowIds.has(p.property.id));

  const toggleAllRows = () => {
    if (isAllExpanded) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(filteredProperties.map(p => p.property.id)));
    }
  };

  // CSVエクスポート
  const handleExportCSV = () => {
    const headers = [
      '管理コード',
      '物件名',
      '種類',
      '所在地',
      '地目',
      '土地面積(㎡)',
      '土地面積(坪)',
      '建物面積(㎡)',
      '建物面積(坪)',
      '仕入決済日',
      '仕入先',
      '土地仕入額',
      '建物仕入額',
      '建物仕入消費税',
      '固定資産税等精算金(仕入)',
      '付随費用合計',
      '総仕入原価',
      '最終売却決済日',
      '買主名',
      '売却件数(区画数)',
      '売上代金合計',
      '売上原価計上額',
      '粗利益',
      '粗利率(%)',
      '売却事業年度',
    ];

    const rows = filteredProperties.map(item => {
      const p = item.property;
      const fin = item.fin;
      const pTax = getPurchaseFixedAssetTax(p);
      const fyLabel = item.soldFY ? item.soldFY.name : '不明';

      return [
        `"${p.code || ''}"`,
        `"${p.name || ''}"`,
        `"${p.propertyType || ''}"`,
        `"${p.location || ''}"`,
        `"${p.landCategory || ''}"`,
        p.landArea || '',
        fin.landAreaTsubo ? fin.landAreaTsubo.toFixed(2) : '',
        p.buildingArea || '',
        fin.buildingAreaTsubo ? fin.buildingAreaTsubo.toFixed(2) : '',
        `"${p.settlementDate || ''}"`,
        `"${p.sellerName || ''}"`,
        p.landPurchasePrice || 0,
        p.buildingPurchasePrice || 0,
        p.buildingPurchaseTax || 0,
        pTax.total,
        fin.incidentalCostsTotal,
        fin.totalAcquisitionCost,
        `"${item.latestSettlementDate || ''}"`,
        `"${item.buyerNamesDisplay}"`,
        item.settledSales.length,
        fin.settledSalesAmount,
        fin.totalCostOfGoodsSold,
        fin.grossProfit,
        fin.grossProfitMargin.toFixed(2),
        `"${fyLabel}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `売却済み物件一覧台帳_${currentFY.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(filename, csvContent);
  };

  return (
    <div className="space-y-3.5">
      {/* 印刷専用ヘッダー (画面上は非表示、印刷時のみ出現) */}
      <div className="hidden print:block mb-4 pb-2 border-b-2 border-slate-900 text-slate-900">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold tracking-tight">売却済み物件一覧（完売台帳）</h1>
            <p className="text-xs text-slate-600 mt-1">
              {companyInfo?.name || '不動産原価管理'} ｜ 対象事業年度: {currentFY.name}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            出力日: {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>

      {/* 1. Header Ribbon & Overview KPI Cards */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  売却済み台帳（前期以前・完売物件）
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  前期以前完売: {summary.totalCount}物件
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                第{currentFY.periodNumber}期より前の事業年度に売却完了（完売）した物件の台帳です。（※当期中に売却された物件は「物件一覧」に表示されます）
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="CSVエクスポート"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV出力</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="印刷"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>台帳印刷</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>前期売却完了物件数</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
              {filteredProperties.length}
              <span className="text-xs font-normal text-slate-500 ml-1">件</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              前期以前に完売・決済完了
            </div>
          </div>

          <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/70">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
              <span>売上代金累計</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-bold text-emerald-900 font-mono mt-0.5">
              {formatCurrency(summary.filteredTotalSales)}
            </div>
            <div className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">
              土地＋建物＋固定資産税等精算金
            </div>
          </div>

          <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/70">
            <div className="flex items-center justify-between text-[11px] text-amber-800 font-medium">
              <span>仕入原価累計 (COGS)</span>
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base font-bold text-amber-900 font-mono mt-0.5">
              {formatCurrency(summary.filteredTotalCOGS)}
            </div>
            <div className="text-[10px] text-amber-700/80 mt-0.5 font-medium">
              仕入本体代金＋付随費用総計
            </div>
          </div>

          <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200/70">
            <div className="flex items-center justify-between text-[11px] text-blue-800 font-medium">
              <span>粗利益累計 (平均利益率)</span>
              <Percent className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-bold text-blue-900 font-mono mt-0.5">
              {formatCurrency(summary.filteredTotalProfit)}
            </div>
            <div className="text-[10px] text-blue-700 font-bold mt-0.5">
              平均粗利率: {summary.filteredAvgMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter, Search & View Controls */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="物件名、所在地、管理コード、仕入先、買主名、仲介で検索..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Sorter & View Toggle */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <select
                aria-label="売却済み物件の並び順"
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortField)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="settlement_desc">最終決済日 (新しい順)</option>
                <option value="settlement_asc">最終決済日 (古い順)</option>
                <option value="sales_desc">売上代金 (高い順)</option>
                <option value="profit_desc">粗利益 (高い順)</option>
                <option value="margin_desc">粗利益率 (高い順)</option>
                <option value="cost_desc">仕入総額 (高い順)</option>
                <option value="code_asc">管理コード順 (昇順)</option>
              </select>
            </div>

            {/* Toggle Table/Cards */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setViewStyle('table')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewStyle === 'table'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="テーブル一覧表示"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('cards')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewStyle === 'cards'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="カード表示"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Fiscal Year Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center">
              <Calendar className="w-2.5 h-2.5 mr-0.5" /> 売却年度:
            </span>

            <button
              type="button"
              onClick={() => setSelectedFYFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                selectedFYFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全期 ({allSoldProperties.length})
            </button>

            {fiscalYears
              .filter(fy => fy.periodNumber < currentFY.periodNumber)
              .map(fy => {
                const count = allSoldProperties.filter(p => p.soldFY?.id === fy.id).length;
                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => setSelectedFYFilter(fy.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedFYFilter === fy.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    第{fy.periodNumber}期 ({count})
                  </button>
                );
              })}
          </div>

          {/* Property Type Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400">種別:</span>
            <select
              aria-label="物件種別で絞り込み"
              value={propertyTypeFilter}
              onChange={e => setPropertyTypeFilter(e.target.value)}
              className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">すべての種別</option>
              <option value="land">土地のみ</option>
              <option value="building">建物のみ</option>
              <option value="land_and_building">土地＋建物</option>
            </select>

            <span className="text-[10px] text-slate-400 font-mono ml-2">
              ({filteredProperties.length}/{allSoldProperties.length}件)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {filteredProperties.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {allSoldProperties.length === 0
                ? '前期以前に売却完了（完売）した物件はありません'
                : '該当する売却済み物件が見つかりませんでした'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {allSoldProperties.length === 0
                ? `※第${currentFY.periodNumber}期（当期）中に売却された物件は「物件一覧」画面に表示されます。決算繰越（年度更新）を行うと、前期以前に完売した物件がこちらの売却済み台帳に自動集約されます。`
                : '検索キーワードや年度・種別の絞り込み条件を変更してお試しください。'}
            </p>
          </div>
        </div>
      )}

      {/* 4. Table View */}
      {filteredProperties.length > 0 && viewStyle === 'table' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-2 w-8 text-center no-print">
                    <button
                      type="button"
                      onClick={toggleAllRows}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                      title={isAllExpanded ? 'すべて折りたたむ' : 'すべて展開'}
                    >
                      {isAllExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 min-w-[170px]">物件コード・物件名</th>
                  <th className="py-2.5 px-3 min-w-[130px]">所在地・面積</th>
                  <th className="py-2.5 px-3 min-w-[130px]">仕入実績</th>
                  <th className="py-2.5 px-3 min-w-[150px]">売却実績・買主</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">売上総額</th>
                  <th className="py-2.5 px-3 text-right min-w-[100px]">売上原価</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">粗利益 (粗利率)</th>
                  <th className="py-2.5 px-2 text-center min-w-[80px]">完売期</th>
                  <th className="py-2.5 px-3 text-center w-24 no-print">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map(item => {
                  const prop = item.property;
                  const fin = item.fin;
                  const isExpanded = expandedRowIds.has(prop.id);
                  const typeBadge = getPropertyTypeBadgeClass(prop.propertyType);
                  const pTax = getPurchaseFixedAssetTax(prop);

                  return (
                    <React.Fragment key={prop.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Expand Toggle */}
                        <td className="py-2 px-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => toggleRow(prop.id)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        {/* Property Code & Name */}
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                            <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {prop.code || '未割当'}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
                            >
                              {typeBadge.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectProperty(prop)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors cursor-pointer line-clamp-1"
                            title="クリックして詳細を表示"
                          >
                            {prop.name}
                          </button>
                        </td>

                        {/* Location & Area */}
                        <td className="py-2 px-3 text-slate-600">
                          <div className="truncate max-w-[160px] text-[11px]" title={prop.location}>
                            {prop.location || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            {prop.landArea ? (
                              <span>土地: {formatArea(prop.landArea).sqm}</span>
                            ) : null}
                            {prop.buildingArea ? (
                              <span>/ 建: {formatArea(prop.buildingArea).sqm}</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Purchase Info */}
                        <td className="py-2 px-3">
                          <div className="text-slate-800 text-[11px] font-medium truncate max-w-[140px]" title={prop.sellerName}>
                            {prop.sellerName || '仕入先未設定'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            決済日: {prop.settlementDate ? prop.settlementDate.replace(/-/g, '/') : '未決済'}
                          </div>
                        </td>

                        {/* Sales Info & Buyers */}
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[150px]" title={item.buyerNamesDisplay}>
                              {item.buyerNamesDisplay}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-emerald-700 font-medium">
                              決済: {item.latestSettlementDate ? item.latestSettlementDate.replace(/-/g, '/') : '—'}
                            </span>
                            {item.settledSales.length > 1 && (
                              <span className="bg-slate-100 text-slate-600 px-1 rounded text-[9px] font-bold">
                                {item.settledSales.length}区画
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Sales Amount */}
                        <td className="py-2 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {formatCurrency(fin.settledSalesAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            売上計上済
                          </div>
                        </td>

                        {/* Total Cost of Goods Sold */}
                        <td className="py-2 px-3 text-right">
                          <div className="font-mono font-medium text-slate-700 text-xs">
                            {formatCurrency(fin.totalCostOfGoodsSold)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            総原価計上
                          </div>
                        </td>

                        {/* Gross Profit & Margin */}
                        <td className="py-2 px-3 text-right">
                          <div className="font-mono font-bold text-emerald-700 text-xs">
                            {formatCurrency(fin.grossProfit)}
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            利益率 {fin.grossProfitMargin.toFixed(1)}%
                          </div>
                        </td>

                        {/* FY Label */}
                        <td className="py-2 px-2 text-center">
                          {item.soldFY ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                item.isSoldInCurrentPeriod
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              第{item.soldFY.periodNumber}期
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2 px-3 text-center no-print">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => onSelectProperty(prop)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="物件詳細を開く"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditProperty(prop)}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              title="物件情報を編集"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `売却済み物件「${prop.name}」を削除しますか？\n（関連する売買契約や付随費用データも全て削除されます）`
                                  )
                                ) {
                                  onDeleteProperty(prop.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="物件を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="p-3.5 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* 仕入内訳 */}
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-bold text-slate-800">
                                  <span>仕入原価内訳</span>
                                  <span className="font-mono text-slate-900">
                                    総原価: {formatCurrency(fin.totalAcquisitionCost)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-slate-400 block">土地仕入本体</span>
                                    <span className="font-mono font-medium text-slate-700">
                                      {formatCurrency(prop.landPurchasePrice || 0)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">建物仕入本体</span>
                                    <span className="font-mono font-medium text-slate-700">
                                      {formatCurrency(prop.buildingPurchasePrice || 0)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">固定資産税等精算金</span>
                                    <span className="font-mono font-medium text-slate-700">
                                      {formatCurrency(pTax.total)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">付随費用累計</span>
                                    <span className="font-mono font-medium text-slate-700">
                                      {formatCurrency(fin.incidentalCostsTotal)}
                                    </span>
                                  </div>
                                </div>
                                {prop.initialInventoryCost ? (
                                  <div className="text-[10px] text-purple-700 bg-purple-50 p-1.5 rounded border border-purple-200">
                                    前期繰越期首棚卸高: {formatCurrency(prop.initialInventoryCost)} ({prop.initialInventoryNote || '前期より繰越'})
                                  </div>
                                ) : null}
                              </div>

                              {/* 売上内訳 */}
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-bold text-slate-800">
                                  <span>販売・売上実績（{item.settledSales.length}件）</span>
                                  <span className="font-mono text-emerald-800">
                                    売上計: {formatCurrency(fin.settledSalesAmount)}
                                  </span>
                                </div>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {item.settledSales.map((s, idx) => {
                                    const sTax = getSaleFixedAssetTax(s);
                                    const sTotal = (s.landPrice || 0) + (s.buildingPrice || 0) + sTax.total;
                                    const profit = sTotal - (s.costOfGoodsSold || 0);

                                    return (
                                      <div
                                        key={s.id || idx}
                                        className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] flex items-center justify-between gap-2"
                                      >
                                        <div>
                                          <div className="font-semibold text-slate-800">
                                            {s.buyerName || `買主未設定 (${idx + 1})`}
                                            {s.broker ? ` (仲介: ${s.broker})` : ''}
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-mono">
                                            決済日: {s.settlementDate ? s.settlementDate.replace(/-/g, '/') : '—'}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-mono font-bold text-slate-900">
                                            {formatCurrency(sTotal)}
                                          </div>
                                          <div className="text-[10px] font-mono text-emerald-600">
                                            粗利: {formatCurrency(profit)}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300 text-[11px]">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right">
                    表示中 {filteredProperties.length} 物件の合計:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-900">
                    {formatCurrency(summary.filteredTotalSales)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700">
                    {formatCurrency(summary.filteredTotalCOGS)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-700">
                    {formatCurrency(summary.filteredTotalProfit)}
                    <span className="block text-[10px] font-normal text-emerald-600">
                      ({summary.filteredAvgMargin.toFixed(1)}%)
                    </span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5. Card View */}
      {filteredProperties.length > 0 && viewStyle === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProperties.map(item => {
            const prop = item.property;
            const fin = item.fin;
            const typeBadge = getPropertyTypeBadgeClass(prop.propertyType);

            return (
              <div
                key={prop.id}
                className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-3.5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {prop.code || '未割当'}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
                      >
                        {typeBadge.label}
                      </span>
                    </div>
                    {item.soldFY && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                          item.isSoldInCurrentPeriod
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        第{item.soldFY.periodNumber}期完売
                      </span>
                    )}
                  </div>

                  {/* Title & Location */}
                  <h3
                    onClick={() => onSelectProperty(prop)}
                    className="font-bold text-slate-900 text-xs hover:text-blue-600 cursor-pointer transition-colors line-clamp-1"
                  >
                    {prop.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {prop.location || '所在地未設定'}
                  </p>

                  {/* Buyer & Date */}
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-100 mt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">買主:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {item.buyerNamesDisplay}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">引渡決済日:</span>
                      <span className="text-slate-700">
                        {item.latestSettlementDate ? item.latestSettlementDate.replace(/-/g, '/') : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">売上金額</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(fin.settledSalesAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">粗利益 (粗利率)</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(fin.grossProfit)}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 block">
                        {fin.grossProfitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    仕入原価: {formatCurrency(fin.totalCostOfGoodsSold)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => onSelectProperty(prop)}
                      className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    >
                      詳細
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProperty(prop)}
                      className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors cursor-pointer"
                      title="編集"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`「${prop.name}」を削除しますか？`)) {
                          onDeleteProperty(prop.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
