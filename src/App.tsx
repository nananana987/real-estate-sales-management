import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  Receipt,
  Boxes,
  Percent,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  History,
  ExternalLink,
} from 'lucide-react';
import { Property, FiscalYear, CompanyInfo, PropertyStatus } from './types';
import {
  loadProperties,
  saveProperties,
  loadFiscalYears,
  saveFiscalYears,
  loadSelectedFiscalYearId,
  saveSelectedFiscalYearId,
  loadCompanyInfo,
  saveCompanyInfo,
  resetAllData,
} from './utils/storage';
import {
  calculateAccountingSummary,
  calculatePropertyFinancials,
  formatCurrency,
  isDateInFiscalYear,
} from './utils/calculations';
import { Header } from './components/Header';
import { PropertyFilterBar, StatusFilterOption, PeriodFilterOption, SortOption } from './components/PropertyFilterBar';
import { PropertyTableView } from './components/PropertyTableView';
import { PropertyCardView } from './components/PropertyCardView';
import { PropertyFormModal } from './components/PropertyFormModal';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { AccountingCheckView } from './components/AccountingCheckView';
import { InventoryReportView } from './components/InventoryReportView';
import { TransactionsView } from './components/TransactionsView';
import { FiscalYearModal } from './components/FiscalYearModal';
import { CompanyModal } from './components/CompanyModal';
import { CsvImportModal } from './components/CsvImportModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { usePwa } from './utils/pwa';

export default function App() {
  // PWA Support & Offline Status
  const { isInstallable, isStandalone, isOnline, isInIframe, openInNewTab, triggerInstall } = usePwa();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  // State
  const [properties, setProperties] = useState<Property[]>(() => loadProperties());
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(() => loadFiscalYears());
  const [selectedFYId, setSelectedFYId] = useState<string>(() => loadSelectedFiscalYearId());
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => loadCompanyInfo());

  // Active View Tab
  const [activeTab, setActiveTab] = useState<
    'properties' | 'accounting' | 'inventory' | 'transactions' | 'rollover'
  >('properties');

  // Filter & Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterOption>('all');
  const [sortOption, setSortOption] = useState<SortOption>('code_asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);

  const [isFYModalOpen, setIsFYModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Active Fiscal Year
  const currentFY = useMemo(() => {
    return fiscalYears.find(y => y.id === selectedFYId) || fiscalYears[0] || {
      id: 'fy-2025',
      name: '第25期 (2025/04/01〜2026/03/31)',
      periodNumber: 25,
      startDate: '2025-04-01',
      endDate: '2026-03-31',
      isCurrent: true,
    };
  }, [fiscalYears, selectedFYId]);

  // Overall Financial Summary for current FY
  const accountingSummary = useMemo(() => {
    return calculateAccountingSummary(properties, currentFY);
  }, [properties, currentFY]);

  // Change Fiscal Year
  const handleSelectFiscalYear = (fyId: string) => {
    setSelectedFYId(fyId);
    saveSelectedFiscalYearId(fyId);
  };

  // Property Handlers
  const handleSaveProperty = (property: Property) => {
    const exists = properties.some(p => p.id === property.id);
    let updated: Property[];
    if (exists) {
      updated = properties.map(p => (p.id === property.id ? property : p));
    } else {
      updated = [property, ...properties];
    }
    setProperties(updated);
    saveProperties(updated);
  };

  const handleDeleteProperty = (propertyId: string) => {
    const updated = properties.filter(p => p.id !== propertyId);
    setProperties(updated);
    saveProperties(updated);
  };

  const handleOpenNewProperty = () => {
    setEditingProperty(null);
    setIsFormModalOpen(true);
  };

  const handleEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (prop: Property) => {
    setDetailProperty(prop);
    setIsDetailModalOpen(true);
  };

  // Fiscal Years update
  const handleFiscalYearsUpdated = (
    updatedFYs: FiscalYear[],
    updatedProps: Property[],
    newSelectedFYId?: string
  ) => {
    setFiscalYears(updatedFYs);
    saveFiscalYears(updatedFYs);
    setProperties(updatedProps);
    saveProperties(updatedProps);
    if (newSelectedFYId) {
      setSelectedFYId(newSelectedFYId);
      saveSelectedFiscalYearId(newSelectedFYId);
    }
  };

  const handleResetData = () => {
    const reset = resetAllData();
    setProperties(reset.properties);
    setFiscalYears(reset.fiscalYears);
    setCompanyInfo(reset.companyInfo);
    setSelectedFYId('fy-1');
  };

  const handleSaveCompanyInfo = (updatedCompany: CompanyInfo) => {
    setCompanyInfo(updatedCompany);
    saveCompanyInfo(updatedCompany);
  };

  const handleImportCsv = (
    importedProperties: Property[],
    mode: 'append' | 'replace' | 'direct_update'
  ) => {
    let updated: Property[];
    if (mode === 'replace' || mode === 'direct_update') {
      updated = importedProperties;
    } else {
      // Append mode: merge, avoiding duplicate codes if any
      const existingCodeMap = new Set(properties.map(p => p.code));
      const filteredNew = importedProperties.map(newProp => {
        if (existingCodeMap.has(newProp.code)) {
          return newProp;
        }
        return newProp;
      });
      updated = [...properties, ...filteredNew];
    }
    setProperties(updated);
    saveProperties(updated);
  };

  // Filtered and Sorted Properties
  const filteredProperties = useMemo(() => {
    return properties
      .filter(property => {
        const fin = calculatePropertyFinancials(property, currentFY);

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = property.code ? property.code.toLowerCase().includes(q) : false;
          const matchName = property.name ? property.name.toLowerCase().includes(q) : false;
          const matchLoc = property.location ? property.location.toLowerCase().includes(q) : false;
          const matchSeller = property.sellerName?.toLowerCase().includes(q) || false;
          const matchLandCategory = property.landCategory?.toLowerCase().includes(q) || false;
          const matchBuyer = (property.sales || []).some(s => s.buyerName?.toLowerCase().includes(q));
          if (!matchCode && !matchName && !matchLoc && !matchSeller && !matchLandCategory && !matchBuyer) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (fin.status !== statusFilter) return false;
        }

        // Period Filter
        if (periodFilter === 'current_period_only') {
          if (!fin.isPurchasedInCurrentPeriod && !fin.isSoldInCurrentPeriod) return false;
        } else if (periodFilter === 'inventory_only') {
          if (fin.endingInventory <= 0) return false;
        } else if (periodFilter === 'sold_only') {
          if (!fin.isSoldInCurrentPeriod) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const finA = calculatePropertyFinancials(a, currentFY);
        const finB = calculatePropertyFinancials(b, currentFY);

        switch (sortOption) {
          case 'code_asc':
            return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
          case 'code_desc':
            return (b.code || '').localeCompare(a.code || '', undefined, { numeric: true, sensitivity: 'base' });
          case 'inventory_desc':
            return finB.endingInventory - finA.endingInventory;
          case 'purchase_price_desc':
            return finB.totalAcquisitionCost - finA.totalAcquisitionCost;
          case 'sales_desc':
            return finB.totalSalesAmount - finA.totalSalesAmount;
          case 'created_desc':
          default:
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
      });
  }, [properties, searchQuery, statusFilter, periodFilter, sortOption, currentFY]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans text-xs">
      {/* AI Studio Iframe Notice Banner (For shared links & PWA installability) */}
      {isInIframe && !isStandalone && (
        <div className="bg-amber-600 text-white px-3 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs no-print">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-200" />
            <span>
              <strong>Google AI Studioの共有フレーム内で開かれています。</strong>
              PCやスマホにアプリとしてインストール（PWA化）する場合は、別タブで直接開いてください。
            </span>
          </div>
          <button
            type="button"
            onClick={openInNewTab}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white text-amber-900 hover:bg-amber-50 rounded font-bold text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>別タブで直接開く（PWA用）</span>
          </button>
        </div>
      )}

      {/* Global Header */}
      <Header
        currentFY={currentFY}
        fiscalYears={fiscalYears}
        onSelectFiscalYear={handleSelectFiscalYear}
        companyInfo={companyInfo}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={tab => {
          if (tab === 'rollover') {
            setIsFYModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenNewPropertyModal={handleOpenNewProperty}
        onOpenFYModal={() => setIsFYModalOpen(true)}
        onOpenCsvImport={() => setIsCsvImportOpen(true)}
        properties={properties}
        onDataUpdated={(newProps, newFYs, newCompany) => {
          setProperties(newProps);
          setFiscalYears(newFYs);
          if (newCompany) setCompanyInfo(newCompany);
        }}
        onResetData={handleResetData}
        isInstallable={isInstallable}
        isStandalone={isStandalone}
        isOnline={isOnline}
        isInIframe={isInIframe}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-3.5 space-y-3.5">
        {/* KPI Financial Overview Ribbon (High Density Modern Financial) */}
        <div id="kpi-overview-ribbon" className="grid grid-cols-2 md:grid-cols-5 gap-2.5 no-print">
          {/* 1. 当期仕入高 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-[11px] mb-0.5">
              <span className="font-bold text-slate-700">当期「仕入」科目</span>
              <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-3 h-3" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 font-mono truncate">
              {formatCurrency(accountingSummary.totalPurchaseAccount)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">本体＋付随費用合計</div>
          </div>

          {/* 2. 当期売上科目 (土地売上・建物売上) */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-[11px] mb-1.5">
              <span className="font-bold text-slate-700">当期「売上」科目</span>
              <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50/80 p-1.5 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-medium">土地売上</span>
                <span className="text-sm font-bold text-emerald-800 font-mono block truncate">
                  {formatCurrency(accountingSummary.salesLandTotal)}
                </span>
              </div>
              <div className="bg-slate-50/80 p-1.5 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-medium">建物売上</span>
                <span className="text-sm font-bold text-teal-800 font-mono block truncate">
                  {formatCurrency(accountingSummary.salesBuildingTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 当期売上原価 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-[11px] mb-0.5">
              <span className="font-bold text-slate-700">当期「売上原価」</span>
              <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
                <Receipt className="w-3 h-3" />
              </div>
            </div>
            <div className="text-base font-bold text-amber-700 font-mono truncate">
              {formatCurrency(accountingSummary.costOfGoodsSoldTotal)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">一部売却按分＋完売原価</div>
          </div>

          {/* 4. 当期売上総利益 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-[11px] mb-0.5">
              <span className="font-bold text-slate-700">当期粗利益 (粗利率)</span>
              <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Percent className="w-3 h-3" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 font-mono truncate">
              {formatCurrency(accountingSummary.grossProfit)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">
              利益率: {accountingSummary.profitMargin.toFixed(1)}%
            </div>
          </div>

          {/* 5. 期末商品棚卸高 */}
          <div className="col-span-2 md:col-span-1 bg-indigo-50/50 p-3 rounded-lg border border-indigo-200/80 shadow-2xs hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between text-indigo-950 text-[11px] mb-0.5">
              <span className="font-bold">「期末商品棚卸高」</span>
              <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Boxes className="w-3 h-3" />
              </div>
            </div>
            <div className="text-base font-bold text-indigo-900 font-mono truncate">
              {formatCurrency(accountingSummary.endingInventoryTotal)}
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5 font-medium">
              期末在庫残高合計
            </div>
          </div>
        </div>

        {/* TAB 1: PROPERTIES (物件一覧 & 総合収支) */}
        {activeTab === 'properties' && (
          <div className="space-y-3">
            <PropertyFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              periodFilter={periodFilter}
              onPeriodFilterChange={setPeriodFilter}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={properties.length}
              filteredCount={filteredProperties.length}
              onPrint={() => window.print()}
            />

            {viewMode === 'table' ? (
              <PropertyTableView
                properties={filteredProperties}
                currentFY={currentFY}
                companyInfo={companyInfo}
                statusFilterLabel={
                  statusFilter === 'all'
                    ? 'すべて'
                    : statusFilter === 'contracted_unsettled'
                    ? '仕入未決済'
                    : statusFilter === 'deposit_paid'
                    ? '手付金支払済'
                    : statusFilter === 'inventory'
                    ? '保有中 (棚卸)'
                    : statusFilter === 'partially_sold'
                    ? '一部売却済'
                    : '完売'
                }
                periodFilterLabel={
                  periodFilter === 'all'
                    ? '全期間の物件'
                    : periodFilter === 'current_period_only'
                    ? '当期取引のある物件'
                    : periodFilter === 'inventory_only'
                    ? '当期末棚卸残高のある物件のみ'
                    : '当期売却済みの物件のみ'
                }
                searchQuery={searchQuery}
                onEditProperty={handleEditProperty}
                onOpenDetail={handleOpenDetail}
                onDeleteProperty={handleDeleteProperty}
                onPrint={() => window.print()}
              />
            ) : (
              <PropertyCardView
                properties={filteredProperties}
                currentFY={currentFY}
                onEditProperty={handleEditProperty}
                onOpenDetail={handleOpenDetail}
                onDeleteProperty={handleDeleteProperty}
              />
            )}
          </div>
        )}

        {/* TAB 2: ACCOUNTING (会計科目突合・決算照合) */}
        {activeTab === 'accounting' && (
          <AccountingCheckView
            properties={properties}
            currentFY={currentFY}
            onSelectProperty={handleOpenDetail}
          />
        )}

        {/* TAB 3: INVENTORY (期末棚卸一覧表) */}
        {activeTab === 'inventory' && (
          <InventoryReportView
            properties={properties}
            currentFY={currentFY}
            onSelectProperty={handleOpenDetail}
          />
        )}

        {/* TAB 4: TRANSACTIONS (当期取引一覧) */}
        {activeTab === 'transactions' && (
          <TransactionsView
            properties={properties}
            currentFY={currentFY}
            onSelectProperty={handleOpenDetail}
          />
        )}
      </main>

      {/* High Density Status Footer */}
      <footer className="bg-white border-t border-slate-200 py-2 px-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 mt-auto">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">システム稼働中</span>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            選択事業年度: <strong className="text-slate-800">{currentFY.name}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            登録物件総数: <strong className="text-slate-800">{properties.length}件</strong>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <span>ローカル自動保存 (LocalStorage)</span>
          <span>•</span>
          <span>高密度モード (High Density UI)</span>
        </div>
      </footer>

      {/* Property Registration & Edit Modal */}
      <PropertyFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProperty(null);
        }}
        onSave={handleSaveProperty}
        editingProperty={editingProperty}
        currentFY={currentFY}
        existingProperties={properties}
      />

      {/* Property Detail & Profit/Loss Sheet Modal */}
      <PropertyDetailModal
        property={detailProperty}
        currentFY={currentFY}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailProperty(null);
        }}
        onEdit={handleEditProperty}
      />

      {/* Fiscal Year Modal (年度設定 & 決算繰越) */}
      <FiscalYearModal
        isOpen={isFYModalOpen}
        onClose={() => setIsFYModalOpen(false)}
        fiscalYears={fiscalYears}
        currentFY={currentFY}
        properties={properties}
        onFiscalYearsUpdated={handleFiscalYearsUpdated}
        onSelectFiscalYear={handleSelectFiscalYear}
      />

      {/* Company Info Modal (会社・顧問先情報設定) */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companyInfo={companyInfo}
        onSaveCompanyInfo={handleSaveCompanyInfo}
      />

      {/* CSV Import Modal (CSV一括取込) */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImport={handleImportCsv}
        existingProperties={properties}
        currentFY={currentFY}
      />

      {/* PWA Install & Offline Guide Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        isInstallable={isInstallable}
        isStandalone={isStandalone}
        isOnline={isOnline}
        isInIframe={isInIframe}
        onOpenInNewTab={openInNewTab}
        onInstall={triggerInstall}
      />
    </div>
  );
}
