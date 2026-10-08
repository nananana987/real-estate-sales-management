import React from 'react';
import {
  Search,
  Filter,
  Layers,
  LayoutGrid,
  List,
  ArrowUpDown,
  Building,
  CheckCircle,
  Printer,
} from 'lucide-react';
import { PropertyStatus } from '../types';

export type StatusFilterOption = 'all' | PropertyStatus;
export type PeriodFilterOption = 'all' | 'current_period_only' | 'inventory_only' | 'sold_only';
export type SortOption =
  | 'code_asc'
  | 'code_desc'
  | 'purchase_price_desc'
  | 'inventory_desc'
  | 'sales_desc'
  | 'created_desc';

interface PropertyFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilterOption;
  onStatusFilterChange: (status: StatusFilterOption) => void;
  periodFilter: PeriodFilterOption;
  onPeriodFilterChange: (period: PeriodFilterOption) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  totalCount: number;
  filteredCount: number;
  soldCount?: number;
  onNavigateToSoldProperties?: () => void;
  onPrint?: () => void;
}

export const PropertyFilterBar: React.FC<PropertyFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  sortOption,
  onSortOptionChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
  soldCount,
  onNavigateToSoldProperties,
  onPrint,
}) => {
  return (
    <div
      id="property-filter-bar"
      className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 no-print"
    >
      {/* Top Search & View Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="物件名、所在地、管理コード、仕入先、買主名で検索..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        {/* View Mode & Sorter & Print */}
        <div className="flex items-center space-x-1.5">
          {/* Print Button */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
              title="物件一覧を印刷"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">一覧を印刷</span>
              <span className="sm:hidden">印刷</span>
            </button>
          )}

          {/* Sorter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <select
              aria-label="並び順"
              value={sortOption}
              onChange={e => onSortOptionChange(e.target.value as SortOption)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="code_asc">管理コード順 (昇順・基本)</option>
              <option value="code_desc">管理コード順 (降順)</option>
              <option value="created_desc">登録順 (新しい順)</option>
              <option value="inventory_desc">棚卸金額 (高い順)</option>
              <option value="purchase_price_desc">仕入金額 (高い順)</option>
              <option value="sales_desc">売上金額 (高い順)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="テーブル一覧表示"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewMode === 'cards'
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
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center">
            <Filter className="w-2.5 h-2.5 mr-0.5" /> 状態:
          </span>

          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            すべて
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('contracted_unsettled')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'contracted_unsettled'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            仕入未決済
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('deposit_paid')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'deposit_paid'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100'
            }`}
          >
            手付金支払済
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('inventory')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'inventory'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            保有中 (棚卸)
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('partially_sold')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'partially_sold'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100'
            }`}
          >
            一部売却済
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('sold_out')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'sold_out'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            当期完売
          </button>

          {onNavigateToSoldProperties && soldCount !== undefined && soldCount > 0 && (
            <button
              type="button"
              onClick={onNavigateToSoldProperties}
              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-300 ml-1.5 cursor-pointer"
              title="前期以前に売却完了した物件の台帳一覧ページへ移動"
            >
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>前期売却済台帳 ({soldCount}件) →</span>
            </button>
          )}
        </div>

        {/* Period Filter (当期関連) */}
        <div className="flex items-center space-x-1 text-xs">
          <select
            aria-label="取引期間の絞り込み"
            value={periodFilter}
            onChange={e => onPeriodFilterChange(e.target.value as PeriodFilterOption)}
            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="all">全期間の物件</option>
            <option value="current_period_only">当期取引のある物件 (仕入/売上)</option>
            <option value="inventory_only">当期末棚卸残高のある物件のみ</option>
            <option value="sold_only">当期売却済みの物件のみ</option>
          </select>
          <span className="text-[10px] text-slate-400 font-mono">
            ({filteredCount}/{totalCount})
          </span>
        </div>
      </div>
    </div>
  );
};
