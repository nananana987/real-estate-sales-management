import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Download,
  Printer,
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  Layers,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  formatArea,
  calculateAccountingSummary,
  getStatusBadgeClass,
  getPropertyTypeBadgeClass,
} from '../utils/calculations';
import { downloadCSV } from '../utils/storage';

interface InventoryReportViewProps {
  properties: Property[];
  currentFY: FiscalYear;
  onSelectProperty: (property: Property) => void;
}

type SortField = 'code' | 'date' | 'acquisition' | 'cogs' | 'endingInventory';
type SortOrder = 'asc' | 'desc';

export const InventoryReportView: React.FC<InventoryReportViewProps> = ({
  properties,
  currentFY,
  onSelectProperty,
}) => {
  const summary = calculateAccountingSummary(properties, currentFY);

  // States for filter, search, sort, and display options
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'inventory_only' | 'all'>('inventory_only');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table'); // Default: 一覧表(table)

  // Calculate row financials
  const allRows = useMemo(() => {
    return properties
      .map(prop => {
        const fin = calculatePropertyFinancials(prop, currentFY);
        const landAreaNum =
          prop.landArea !== undefined && prop.landArea !== null && prop.landArea !== ''
            ? Number(prop.landArea)
            : undefined;
        const buildingAreaNum =
          prop.buildingArea !== undefined && prop.buildingArea !== null && prop.buildingArea !== ''
            ? Number(prop.buildingArea)
            : undefined;

        return {
          property: prop,
          fin,
          landAreaNum,
          buildingAreaNum,
        };
      })
      .filter(
        row =>
          row.fin.endingInventory > 0 ||
          row.fin.totalCostOfGoodsSold > 0 ||
          row.fin.totalAcquisitionCost > 0 ||
          row.property.initialInventoryCost > 0
      );
  }, [properties, currentFY]);

  // Filter and Sort
  const filteredAndSortedRows = useMemo(() => {
    return allRows
      .filter(row => {
        // Filter by inventory existence
        if (filterMode === 'inventory_only' && row.fin.endingInventory <= 0) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const p = row.property;
          const matchCode = (p.code || '').toLowerCase().includes(q);
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchLoc = (p.location || '').toLowerCase().includes(q);
          const matchSeller = (p.sellerName || '').toLowerCase().includes(q);
          const matchCategory = (p.landCategory || '').toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchLoc && !matchSeller && !matchCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'code') {
          cmp = (a.property.code || '').localeCompare(b.property.code || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        } else if (sortField === 'date') {
          const dateA = a.property.settlementDate || '';
          const dateB = b.property.settlementDate || '';
          cmp = dateA.localeCompare(dateB);
        } else if (sortField === 'acquisition') {
          cmp = a.fin.totalAcquisitionCost - b.fin.totalAcquisitionCost;
        } else if (sortField === 'cogs') {
          cmp = a.fin.totalCostOfGoodsSold - b.fin.totalCostOfGoodsSold;
        } else if (sortField === 'endingInventory') {
          cmp = a.fin.endingInventory - b.fin.endingInventory;
        }

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [allRows, filterMode, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'code' ? 'asc' : 'desc');
    }
  };

  const toggleRowExpand = (id: string) => {
    const next = new Set(expandedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRowIds(next);
  };

  // Calculate totals for footer
  const totals = useMemo(() => {
    return filteredAndSortedRows.reduce(
      (acc, r) => {
        acc.initialInventory += r.property.initialInventoryCost || 0;
        acc.purchaseBase += r.fin.purchaseBaseTotal;
        acc.incidental += r.fin.incidentalCostsTotal;
        acc.totalAcquisition += r.fin.totalAcquisitionCost;
        acc.cogs += r.fin.totalCostOfGoodsSold;
        acc.endingInventory += r.fin.endingInventory;
        acc.landArea += r.landAreaNum || 0;
        acc.buildingArea += r.buildingAreaNum || 0;
        return acc;
      },
      {
        initialInventory: 0,
        purchaseBase: 0,
        incidental: 0,
        totalAcquisition: 0,
        cogs: 0,
        endingInventory: 0,
        landArea: 0,
        buildingArea: 0,
      }
    );
  }, [filteredAndSortedRows]);

  // CSV Export
  const handleExportCSV = () => {
    let csv = `期末棚卸一覧表 (商品・仕掛品内訳書)\n`;
    csv += `事業年度,${currentFY.name}\n`;
    csv += `基準期末日,${currentFY.endDate}\n`;
    csv += `期末商品棚卸高合計,${totals.endingInventory}\n\n`;

    csv += `No,物件管理コード,物件所在地,地目,種類,土地面積(㎡),建物面積(㎡),取得日(仕入決済日),状態,期首繰越原価(円),総仕入原価(円),計上売上原価(円),期末棚卸残高(円),原価計算プロセス・根拠メモ\n`;

    filteredAndSortedRows.forEach(({ property: prop, fin, landAreaNum, buildingAreaNum }, idx) => {
      const calcNotes = (prop.sales || [])
        .map(s => (s.costCalculationNote ? `[${s.buyerName || s.partialSaleName || '売上'}] ${s.costCalculationNote}` : ''))
        .filter(Boolean)
        .join(' / ');

      const landStr = landAreaNum !== undefined ? landAreaNum : '';
      const bldgStr = buildingAreaNum !== undefined ? buildingAreaNum : '';

      csv += `${idx + 1},"${prop.code}","${prop.location || prop.name}","${prop.landCategory || '-'}","${
        prop.propertyType || '-'
      }",${landStr},${bldgStr},"${prop.settlementDate || '-'}","${fin.statusLabel}",${
        prop.initialInventoryCost || 0
      },${fin.totalAcquisitionCost},${
        fin.totalCostOfGoodsSold
      },${fin.endingInventory},"${calcNotes || prop.notes || '-'}"\n`;
    });

    // Total row
    csv += `合計,,,,,,${totals.landArea > 0 ? totals.landArea : ''},${
      totals.buildingArea > 0 ? totals.buildingArea : ''
    },,,${totals.initialInventory},${totals.totalAcquisition},${
      totals.cogs
    },${totals.endingInventory},\n`;

    downloadCSV(
      `期末棚卸一覧表_${currentFY.periodNumber}期_${new Date().toISOString().slice(0, 10)}.csv`,
      csv
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3.5">
      {/* 印刷用ヘッダー (print時のみ表示) */}
      <div className="hidden print:block mb-3 border-b-2 border-slate-800 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] text-slate-600 font-bold">{currentFY.name}（基準日: {currentFY.endDate}）</div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">期末棚卸一覧表 (商品・仕掛品原価一覧)</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">印刷日時: {new Date().toLocaleDateString('ja-JP')}</div>
            <div className="text-xs font-bold text-emerald-800 font-mono">
              期末棚卸高合計: {formatCurrency(totals.endingInventory)} ({filteredAndSortedRows.length}件)
            </div>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 no-print">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {currentFY.name} 期末棚卸資産
            </span>
            <span className="text-[11px] text-slate-500 font-mono">（基準日: {currentFY.endDate}）</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 tracking-tight flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-emerald-600" />
            <span>期末棚卸一覧表</span>
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            保有中および当期取引対象物件の前期繰越・当期仕入・計上売上原価・期末棚卸残高をコンパクトに一覧表示します。
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* 表示形式切り替え (一覧表 vs 明細カード) */}
          <div className="inline-flex rounded-md border border-slate-300 bg-slate-100 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewStyle('table')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewStyle === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="一覧表（テーブル形式）で表示"
            >
              <LayoutList className="w-3.5 h-3.5 text-blue-600" />
              <span>一覧表</span>
            </button>
            <button
              type="button"
              onClick={() => setViewStyle('cards')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewStyle === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="詳細な計算プロセス付きカード形式で表示"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
              <span>明細カード</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>帳票印刷</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#001529] hover:bg-[#002244] text-white rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>一覧表 CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 no-print">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">期末棚卸残高あり物件</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
            {allRows.filter(r => r.fin.endingInventory > 0).length}{' '}
            <span className="text-xs font-normal text-slate-500">/ 全 {allRows.length} 物件</span>
          </p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">総仕入原価累計</span>
          <p className="text-lg font-bold text-blue-700 mt-0.5 font-mono">
            {formatCurrency(allRows.reduce((sum, r) => sum + r.fin.totalAcquisitionCost, 0))}
          </p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">計上売上原価累計</span>
          <p className="text-lg font-bold text-amber-700 mt-0.5 font-mono">
            {formatCurrency(allRows.reduce((sum, r) => sum + r.fin.totalCostOfGoodsSold, 0))}
          </p>
        </div>

        <div className="bg-emerald-50/90 p-3 rounded-lg border border-emerald-300 shadow-2xs">
          <span className="text-[11px] text-emerald-800 font-bold">期末商品棚卸高 (合計)</span>
          <p className="text-lg font-bold text-emerald-900 mt-0.5 font-mono">
            {formatCurrency(summary.endingInventoryTotal)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* Quick Filter Buttons */}
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode('inventory_only')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'inventory_only'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              期末棚卸残高あり ({allRows.filter(r => r.fin.endingInventory > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全対象物件 ({allRows.length})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            表示中: <strong className="text-slate-800 font-mono">{filteredAndSortedRows.length}</strong> 件
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="物件コード、所在地、地目で検索..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Content: TABLE VIEW (一覧表) */}
      {viewStyle === 'table' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            {filteredAndSortedRows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">条件に一致する棚卸対象物件はありません</p>
                <p className="mt-1 text-slate-400">
                  検索条件を変更するか、上の「全対象物件」タブを選択してください。
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center text-slate-400 font-mono">No</th>
                    <th
                      className="py-2 px-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap"
                      onClick={() => handleSort('code')}
                      title="物件コードで並び替え"
                    >
                      <div className="flex items-center space-x-1">
                        <span>物件コード</span>
                        <span className="no-print inline-flex">
                          {sortField === 'code' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="py-2 px-2.5 min-w-[160px]">物件所在地・物件名</th>
                    <th className="py-2 px-2 whitespace-nowrap">種類 / 地目</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">土地面積</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">建物面積</th>
                    <th
                      className="py-2 px-2 col-date whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors w-[105px] min-w-[105px]"
                      onClick={() => handleSort('date')}
                      title="取得日(仕入決済日)で並び替え"
                    >
                      <div className="flex items-center space-x-1">
                        <span>取得日</span>
                        <span className="no-print inline-flex">
                          {sortField === 'date' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center whitespace-nowrap">状態</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap">前期繰越原価</th>
                    <th
                      className="py-2 px-2.5 text-right whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('acquisition')}
                      title="総仕入原価で並び替え"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>総仕入原価</span>
                        <span className="no-print inline-flex">
                          {sortField === 'acquisition' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </span>
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('cogs')}
                      title="計上売上原価で並び替え"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>計上売上原価</span>
                        <span className="no-print inline-flex">
                          {sortField === 'cogs' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </span>
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right whitespace-nowrap bg-emerald-50/70 text-emerald-900 cursor-pointer select-none hover:bg-emerald-100/80 transition-colors"
                      onClick={() => handleSort('endingInventory')}
                      title="期末棚卸残高で並び替え"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span className="font-bold">期末棚卸高</span>
                        <span className="no-print inline-flex">
                          {sortField === 'endingInventory' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-800" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-emerald-600 opacity-60" />
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center w-16 no-print">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredAndSortedRows.map(({ property: prop, fin, landAreaNum, buildingAreaNum }, idx) => {
                    const isExpanded = expandedRowIds.has(prop.id);
                    const statusBadge = getStatusBadgeClass(fin.status);
                    const typeBadge = getPropertyTypeBadgeClass(prop.propertyType);
                    const hasNotes =
                      prop.sales?.some(s => s.costCalculationNote) ||
                      prop.initialInventoryNote ||
                      prop.notes;

                    return (
                      <React.Fragment key={prop.id}>
                        <tr
                          className={`hover:bg-blue-50/40 transition-colors ${
                            fin.endingInventory <= 0 ? 'bg-slate-50/50 text-slate-500' : ''
                          }`}
                        >
                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap font-mono font-bold text-slate-800">
                            <button
                              type="button"
                              onClick={() => onSelectProperty(prop)}
                              className="text-blue-600 hover:text-blue-900 hover:underline cursor-pointer"
                              title="物件を開く"
                            >
                              {prop.code}
                            </button>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <div className="font-semibold text-slate-900">{prop.location || prop.name}</div>
                            {prop.name && prop.name !== prop.location && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">{prop.name}</div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${typeBadge.bg} ${typeBadge.text} border ${typeBadge.border}`}>
                                {typeBadge.label}
                              </span>
                              {prop.landCategory && (
                                <span className="text-[10px] text-slate-500">
                                  {prop.landCategory}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-800 whitespace-nowrap">
                            {landAreaNum !== undefined
                              ? `${landAreaNum.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡`
                              : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-800 whitespace-nowrap">
                            {buildingAreaNum !== undefined
                              ? `${buildingAreaNum.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡`
                              : '-'}
                          </td>
                          <td className="py-1.5 px-2 col-date font-mono text-slate-700 whitespace-nowrap w-[105px] min-w-[105px]">
                            {prop.settlementDate || '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}>
                              {fin.statusLabel}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(prop.initialInventoryCost || 0)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {formatCurrency(fin.totalAcquisitionCost)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-amber-800 whitespace-nowrap">
                            {formatCurrency(fin.totalCostOfGoodsSold)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 whitespace-nowrap text-xs">
                            {formatCurrency(fin.endingInventory)}
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center space-x-1">
                              {hasNotes && (
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpand(prop.id)}
                                  className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer"
                                  title={isExpanded ? '計算メモを閉じる' : '売上原価の計算メモ・根拠を見る'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onSelectProperty(prop)}
                                className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer text-xs"
                              >
                                開く
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expand Row for Notes / Calculation Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 text-xs border-b border-slate-200 no-print">
                            <td colSpan={13} className="py-2.5 px-4">
                              <div className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs space-y-2">
                                <div className="font-bold text-slate-800 flex items-center space-x-1 text-xs">
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  <span>【{prop.code}】売上原価の算定プロセス & 棚卸評価メモ</span>
                                </div>

                                {prop.sales && prop.sales.length > 0 ? (
                                  <div className="space-y-1.5 pl-1">
                                    {prop.sales.map((sale, sIdx) => (
                                      <div
                                        key={sale.id}
                                        className="bg-slate-50 p-2 rounded border border-slate-200 text-slate-700 text-[11px]"
                                      >
                                        <div className="flex items-center justify-between font-semibold text-slate-900">
                                          <span>
                                            【売上#{sIdx + 1}】 {sale.buyerName} 様{' '}
                                            {sale.partialSaleName ? `(${sale.partialSaleName})` : ''}
                                            {sale.settlementDate && ` [決済: ${sale.settlementDate}]`}
                                          </span>
                                          <span className="font-mono text-amber-800 font-bold">
                                            計上売上原価: {formatCurrency(sale.costOfGoodsSold)}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                          {sale.costCalculationNote || '売上原価の計算メモは未登録です。'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 text-[11px]">
                                    現在未売却のため、総仕入原価 {formatCurrency(fin.totalAcquisitionCost)}{' '}
                                    が全額期末棚卸高（仕掛品・商品）として計上されています。
                                  </p>
                                )}

                                {prop.initialInventoryNote && (
                                  <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                                    <strong>前期繰越情報:</strong> {prop.initialInventoryNote}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* Table Footer */}
                <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-2.5 text-center text-slate-700">
                      期末棚卸 合計 ({filteredAndSortedRows.length}件)
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-800 whitespace-nowrap">
                      {totals.landArea > 0
                        ? `${totals.landArea.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-800 whitespace-nowrap">
                      {totals.buildingArea > 0
                        ? `${totals.buildingArea.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡`
                        : '-'}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 whitespace-nowrap">
                      {formatCurrency(totals.initialInventory)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-900 whitespace-nowrap font-bold">
                      {formatCurrency(totals.totalAcquisition)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-amber-900 whitespace-nowrap font-bold">
                      {formatCurrency(totals.cogs)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-emerald-900 bg-emerald-100/70 whitespace-nowrap font-bold text-sm">
                      {formatCurrency(totals.endingInventory)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Alternative: DETAILED CARD VIEW (従来の明細カード表示) */
        <div className="space-y-2.5">
          {filteredAndSortedRows.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500 shadow-2xs">
              <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-xs">当期の棚卸対象物件はありません</p>
            </div>
          ) : (
            filteredAndSortedRows.map(({ property: prop, fin }) => {
              const landAreaFormatted = formatArea(prop.landArea);

              return (
                <div
                  key={prop.id}
                  className={`bg-white rounded-lg border transition-all ${
                    fin.endingInventory > 0
                      ? 'border-slate-200 shadow-2xs hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50/40 opacity-75'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-slate-50/60 rounded-t-lg">
                    <div className="flex items-start space-x-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold">
                        {prop.code}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{prop.location}</h3>
                        {prop.name && prop.name !== prop.location && (
                          <p className="text-[10px] text-slate-400">{prop.name}</p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.2">
                          地目: {prop.landCategory} ｜ 土地面積:{' '}
                          {landAreaFormatted.sqm} ({landAreaFormatted.tsubo})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">期末棚卸残高</span>
                        <p className="text-sm font-bold text-emerald-700 font-mono">
                          {formatCurrency(fin.endingInventory)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectProperty(prop)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        開く
                      </button>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="p-3 space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500">前期繰越原価</span>
                        <p className="font-bold text-slate-800 font-mono mt-0.2 text-xs">
                          {formatCurrency(prop.initialInventoryCost || 0)}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500">総仕入原価</span>
                        <p className="font-bold text-slate-900 font-mono mt-0.2 text-xs">
                          {formatCurrency(fin.totalAcquisitionCost)}
                        </p>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded border border-amber-200">
                        <span className="text-[10px] text-amber-800">計上売上原価累計</span>
                        <p className="font-bold text-amber-900 font-mono mt-0.2 text-xs">
                          {formatCurrency(fin.totalCostOfGoodsSold)}
                        </p>
                      </div>
                      <div className="bg-emerald-50/70 p-2 rounded border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold">期末棚卸残高</span>
                        <p className="font-bold text-emerald-900 font-mono mt-0.2 text-xs">
                          {formatCurrency(fin.endingInventory)}
                        </p>
                      </div>
                    </div>

                    {/* Calculation Notes */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-800 flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-slate-600" />
                        <span className="text-[11px]">売上原価の算定プロセス & 棚卸評価メモ</span>
                      </div>

                      {prop.sales && prop.sales.length > 0 ? (
                        <div className="space-y-1 pl-0.5">
                          {prop.sales.map((sale, sIdx) => (
                            <div
                              key={sale.id}
                              className="bg-white p-2 rounded border border-slate-200 text-slate-700"
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-slate-900 text-xs">
                                  【売上#{sIdx + 1}】 {sale.buyerName} 様{' '}
                                  {sale.partialSaleName ? `(${sale.partialSaleName})` : ''}
                                </span>
                                <span className="font-mono font-bold text-amber-700 text-xs">
                                  計上原価: {formatCurrency(sale.costOfGoodsSold)}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                {sale.costCalculationNote ||
                                  '売上原価の計算メモは未登録です（一括計上または手入力）。'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-[11px]">
                          現在未売却のため、総仕入原価 {formatCurrency(fin.totalAcquisitionCost)}{' '}
                          が全額期末棚卸高（仕掛品・商品）として計上されています。
                        </p>
                      )}

                      {prop.initialInventoryNote && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <strong>前期繰越情報:</strong> {prop.initialInventoryNote}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
