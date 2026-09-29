import React, { useState } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Clock,
  Download,
  Printer,
  Calendar,
  Building,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  isDateInFiscalYear,
  getPropertyTypeBadgeClass,
} from '../utils/calculations';
import { downloadCSV } from '../utils/storage';

interface TransactionsViewProps {
  properties: Property[];
  currentFY: FiscalYear;
  onSelectProperty: (property: Property) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  properties,
  currentFY,
  onSelectProperty,
}) => {
  const [subTab, setSubTab] = useState<'purchases' | 'sales' | 'costs' | 'pending'>('sales');
  const [sortField, setSortField] = useState<'date' | 'code'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'date' | 'code') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter Transactions for current fiscal year
  // 1. 当期売却物件・売上取引 (決済日が当期内)
  const currentSales: {
    property: Property;
    sale: any;
    settlementDate: string;
    purchaseSettlementDate: string; // 取得日 (仕入決済日)
    buyerName: string;
    buyerAddress: string;
    landAreaNum?: number;
    buildingAreaNum?: number;
    landAreaDisplay: string;
    buildingAreaDisplay: string;
    saleName: string;
    landPriceRaw: number;
    buildingPriceRaw: number;
    landPriceWithTax: number;
    buildingPriceWithTax: number;
    taxLand: number;
    taxBldg: number;
    fixedAssetTax: number;
    totalAmount: number;
  }[] = [];

  // 2. 当期仕入物件 (決済日が当期内)
  const currentPurchases: {
    property: Property;
    settlementDate: string;
    sellerName: string;
    sellerAddress: string;
    landPriceRaw: number;
    buildingPriceRaw: number;
    landPriceWithTax: number;
    buildingPriceWithTax: number;
    taxLand: number;
    taxBldg: number;
    fixedAssetTax: number;
    totalBasePrice: number;
    incidentalCostTotal: number;
    totalCost: number;
  }[] = [];

  // 3. 当期仕入付随費用 (支払日が当期内)
  const currentIncidentalCosts: {
    property: Property;
    costType: string;
    payee: string;
    paymentDate: string;
    amount: number;
    memo: string;
  }[] = [];

  // 4. 未決済・契約中 (仕入未決済 or 手付金のみ支払済)
  const pendingPurchases: {
    property: Property;
    contractDate: string;
    statusLabel: string;
    depositAmount: number;
    depositDate?: string;
    contractPrice: number;
  }[] = [];

  properties.forEach(prop => {
    const fin = calculatePropertyFinancials(prop, currentFY);

    // Sales in FY
    (prop.sales || []).forEach(sale => {
      if (isDateInFiscalYear(sale.settlementDate, currentFY)) {
        const sTaxLand = sale.fixedAssetTaxSettlementLand || 0;
        const sTaxBldg = (sale.fixedAssetTaxSettlementBuilding || 0) + (sale.fixedAssetTaxSettlementBuildingTax || 0);
        const legacyTax = (!sale.fixedAssetTaxSettlementLand && !sale.fixedAssetTaxSettlementBuilding) ? (sale.fixedAssetTaxSettlement || 0) : 0;
        const fixedAssetTax = sTaxLand + sTaxBldg + legacyTax;

        // legacyTax（内訳未分離の旧データ）：建物のみ物件なら建物へ、それ以外は土地へ配分
        const allocLegacyLand = prop.propertyType === 'building' ? 0 : legacyTax;
        const allocLegacyBldg = prop.propertyType === 'building' ? legacyTax : 0;

        const effectiveTaxLand = sTaxLand + allocLegacyLand;
        const effectiveTaxBldg = sTaxBldg + allocLegacyBldg;

        // 土地売上、建物売上の金額にそれぞれの固定資産税精算金を合計
        const landPriceWithTax = (sale.landPrice || 0) + effectiveTaxLand;
        const buildingPriceWithTax = (sale.buildingPrice || 0) + effectiveTaxBldg;

        const totalAmount = landPriceWithTax + buildingPriceWithTax;
        const buyerAddress = sale.buyerAddress || '-';
        const purchaseSettlementDate = prop.settlementDate || '-';

        const landAreaRaw =
          sale.soldLandArea !== undefined && sale.soldLandArea !== null && sale.soldLandArea !== ''
            ? Number(sale.soldLandArea)
            : (prop.landArea !== undefined && prop.landArea !== null && prop.landArea !== '' ? Number(prop.landArea) : undefined);
        const landAreaNum = (landAreaRaw !== undefined && !isNaN(landAreaRaw)) ? landAreaRaw : undefined;
        const landAreaDisplay = landAreaNum !== undefined ? `${landAreaNum.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡` : '-';

        const buildingAreaRaw =
          sale.soldBuildingArea !== undefined && sale.soldBuildingArea !== null && sale.soldBuildingArea !== ''
            ? Number(sale.soldBuildingArea)
            : (prop.buildingArea !== undefined && prop.buildingArea !== null && prop.buildingArea !== '' ? Number(prop.buildingArea) : undefined);
        const buildingAreaNum = (buildingAreaRaw !== undefined && !isNaN(buildingAreaRaw)) ? buildingAreaRaw : undefined;
        const buildingAreaDisplay = buildingAreaNum !== undefined ? `${buildingAreaNum.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡` : '-';

        currentSales.push({
          property: prop,
          sale,
          settlementDate: sale.settlementDate!,
          purchaseSettlementDate,
          buyerName: sale.buyerName,
          buyerAddress,
          landAreaNum,
          buildingAreaNum,
          landAreaDisplay,
          buildingAreaDisplay,
          saleName: sale.partialSaleName ? `[${sale.partialSaleName}]` : '全部売却',
          landPriceRaw: sale.landPrice || 0,
          buildingPriceRaw: sale.buildingPrice || 0,
          landPriceWithTax,
          buildingPriceWithTax,
          taxLand: effectiveTaxLand,
          taxBldg: effectiveTaxBldg,
          fixedAssetTax,
          totalAmount,
        });
      }
    });

    // Purchases in FY
    if (isDateInFiscalYear(prop.settlementDate, currentFY)) {
      const pTaxLand = prop.fixedAssetTaxSettlementLand || 0;
      const pTaxBldg =
        (prop.fixedAssetTaxSettlementBuilding || 0) +
        (prop.fixedAssetTaxSettlementBuildingTax || 0);
      const legacyTax =
        !prop.fixedAssetTaxSettlementLand && !prop.fixedAssetTaxSettlementBuilding
          ? prop.fixedAssetTaxSettlement || 0
          : 0;
      const fixedAssetTax = pTaxLand + pTaxBldg + legacyTax;

      // legacyTax（内訳未分離の旧データ）：建物のみ物件なら建物へ、それ以外は土地へ配分
      const allocLegacyLand = prop.propertyType === 'building' ? 0 : legacyTax;
      const allocLegacyBldg = prop.propertyType === 'building' ? legacyTax : 0;

      const effectiveTaxLand = pTaxLand + allocLegacyLand;
      const effectiveTaxBldg = pTaxBldg + allocLegacyBldg;

      // 土地仕入、建物仕入の金額にそれぞれの固定資産税精算金を合計
      const landPriceWithTax = (prop.landPurchasePrice || 0) + effectiveTaxLand;
      const buildingPriceWithTax = (prop.buildingPurchasePrice || 0) + effectiveTaxBldg;
      const totalBasePrice = landPriceWithTax + buildingPriceWithTax;

      const sellerAddress = prop.sellerAddress || '-';

      currentPurchases.push({
        property: prop,
        settlementDate: prop.settlementDate!,
        sellerName: prop.sellerName || '売主',
        sellerAddress,
        landPriceRaw: prop.landPurchasePrice || 0,
        buildingPriceRaw: prop.buildingPurchasePrice || 0,
        landPriceWithTax,
        buildingPriceWithTax,
        taxLand: effectiveTaxLand,
        taxBldg: effectiveTaxBldg,
        fixedAssetTax,
        totalBasePrice,
        incidentalCostTotal: fin.incidentalCostsTotal,
        totalCost: totalBasePrice + fin.incidentalCostsTotal,
      });
    }

    // Incidental Costs in FY
    (prop.incidentalCosts || []).forEach(cost => {
      if (isDateInFiscalYear(cost.paymentDate, currentFY)) {
        currentIncidentalCosts.push({
          property: prop,
          costType: cost.costType,
          payee: cost.payee || '-',
          paymentDate: cost.paymentDate,
          amount: cost.amount || 0,
          memo: cost.memo || '',
        });
      }
    });

    // Pending Purchases
    if (!prop.settlementDate && prop.contractDate) {
      const fixedAssetTax = fin.purchaseFixedAssetTaxTotal;
      pendingPurchases.push({
        property: prop,
        contractDate: prop.contractDate,
        statusLabel: fin.statusLabel,
        depositAmount: prop.depositAmount || 0,
        depositDate: prop.depositSettlementDate,
        contractPrice:
          (prop.landPurchasePrice || 0) +
          (prop.buildingPurchasePrice || 0) +
          fixedAssetTax,
      });
    }
  });

  // Sort
  currentSales.sort((a, b) => {
    if (sortField === 'date') {
      const cmp = (a.settlementDate || '').localeCompare(b.settlementDate || '');
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
    } else {
      const cmp = (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.settlementDate || '').localeCompare(b.settlementDate || '');
    }
  });

  currentPurchases.sort((a, b) => {
    if (sortField === 'date') {
      const cmp = (a.settlementDate || '').localeCompare(b.settlementDate || '');
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
    } else {
      const cmp = (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.settlementDate || '').localeCompare(b.settlementDate || '');
    }
  });

  currentIncidentalCosts.sort((a, b) => {
    if (sortField === 'date') {
      const cmp = (a.paymentDate || '').localeCompare(b.paymentDate || '');
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
    } else {
      const cmp = (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.paymentDate || '').localeCompare(b.paymentDate || '');
    }
  });

  pendingPurchases.sort((a, b) => {
    if (sortField === 'date') {
      const dateA = a.contractDate || a.property.settlementDate || '';
      const dateB = b.contractDate || b.property.settlementDate || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      return (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
    } else {
      const cmp = (a.property.code || '').localeCompare(b.property.code || '', undefined, { numeric: true });
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      const dateA = a.contractDate || a.property.settlementDate || '';
      const dateB = b.contractDate || b.property.settlementDate || '';
      return dateA.localeCompare(dateB);
    }
  });

  const handleExportCSV = () => {
    let csv = `当期取引一覧 (${currentFY.name})\n\n`;

    if (subTab === 'sales') {
      csv += `【当期売却物件・売上決済一覧】\n`;
      csv += `決済日,取得日(仕入決済日),物件コード,物件所在地,区画/売却区分,買主名,買主住所,土地面積(㎡),建物面積(㎡),土地売上[精算金含](円),建物売上[精算金含](円),精算金合計(円),売上総額(円)\n`;
      currentSales.forEach(s => {
        csv += `"${s.settlementDate}","${s.purchaseSettlementDate}","${s.property.code}","${s.property.location}","${s.saleName}","${s.buyerName}","${s.buyerAddress}",${s.landAreaNum !== undefined ? s.landAreaNum : ''},${s.buildingAreaNum !== undefined ? s.buildingAreaNum : ''},${s.landPriceWithTax},${s.buildingPriceWithTax},${s.fixedAssetTax},${s.totalAmount}\n`;
      });
    } else if (subTab === 'purchases') {
      csv += `【当期仕入物件 (決済済) 一覧】\n`;
      csv += `決済日,物件コード,物件所在地,土地建物の種類,地目,土地面積(㎡),建物面積(㎡),仕入先(売主),仕入先住所,土地仕入[精算金含](円),建物仕入[精算金含](円),精算金合計(円),仕入本体計(円),付随費用計(円),総仕入原価(円)\n`;
      currentPurchases.forEach(p => {
        const typeLabel = getPropertyTypeBadgeClass(p.property.propertyType).label;
        const landCategory = p.property.landCategory || '-';
        const landArea = p.property.landArea !== undefined && p.property.landArea !== null ? p.property.landArea : 0;
        const buildingArea = p.property.buildingArea !== undefined && p.property.buildingArea !== null ? p.property.buildingArea : 0;
        csv += `"${p.settlementDate}","${p.property.code}","${p.property.location}","${typeLabel}","${landCategory}",${landArea},${buildingArea},"${p.sellerName}","${p.sellerAddress}",${p.landPriceWithTax},${p.buildingPriceWithTax},${p.fixedAssetTax},${p.totalBasePrice},${p.incidentalCostTotal},${p.totalCost}\n`;
      });
    } else if (subTab === 'costs') {
      csv += `【当期仕入付随費用 支払一覧】\n`;
      csv += `支払日,物件コード,物件所在地,費用の種類,相手先(支払先),金額(円),備考\n`;
      currentIncidentalCosts.forEach(c => {
        csv += `"${c.paymentDate}","${c.property.code}","${c.property.location}","${c.costType}","${c.payee}",${c.amount},"${c.memo}"\n`;
      });
    } else {
      csv += `【未決済・契約中物件一覧】\n`;
      csv += `契約日,物件コード,物件所在地,現在の状態,契約金額(円),手付金額(円),手付金支払日\n`;
      pendingPurchases.forEach(p => {
        csv += `"${p.contractDate}","${p.property.code}","${p.property.location}","${p.statusLabel}",${p.contractPrice},${p.depositAmount},"${p.depositDate || '未払'}"\n`;
      });
    }

    downloadCSV(`当期取引_${subTab}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentTabName =
    subTab === 'sales'
      ? '当期売却・売上'
      : subTab === 'purchases'
      ? '当期仕入 (決済済)'
      : subTab === 'costs'
      ? '当期仕入付随費用'
      : '未決済・契約中';

  return (
    <div className="space-y-3.5">
      {/* 印刷専用ヘッダー */}
      <div className="hidden print-only mb-3 border-b-2 border-slate-900 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              当期取引一覧【{currentTabName}】
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              対象会計期間: {currentFY.name}（{currentFY.startDate} 〜 {currentFY.endDate}）
              <span className="ml-3 text-slate-500 font-medium">
                並び順: {sortField === 'date' ? `日付 (${sortOrder === 'asc' ? '古い順 ↑' : '新しい順 ↓'})` : `物件コード (${sortOrder === 'asc' ? '昇順 ↑' : '降順 ↓'})`}
              </span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            出力日: {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {currentFY.name} 取引推移
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              （{currentFY.startDate} 〜 {currentFY.endDate}）
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 tracking-tight">
            当期取引一覧 (売却・仕入・付随費用・契約中)
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            当期中に決済・取引された不動産の売上、仕入本体、付随費用の個別レコードを絞り込み表示します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Sorter Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500 font-semibold">並び順:</span>
            <select
              aria-label="取引並び順"
              value={`${sortField}_${sortOrder}`}
              onChange={e => {
                const [field, order] = e.target.value.split('_') as ['date' | 'code', 'asc' | 'desc'];
                setSortField(field);
                setSortOrder(order);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="date_asc">決済日・日付 (古い順 ↑)</option>
              <option value="date_desc">決済日・日付 (新しい順 ↓)</option>
              <option value="code_asc">物件コード (昇順 A→Z ↑)</option>
              <option value="code_desc">物件コード (降順 Z→A ↓)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>印刷</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>表示中の取引 CSV</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-3 pt-1 space-x-1 shadow-2xs overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => setSubTab('sales')}
          className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'sales'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>当期売却・売上 ({currentSales.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('purchases')}
          className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'purchases'
              ? 'border-blue-600 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          <span>当期仕入 (決済済) ({currentPurchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('costs')}
          className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'costs'
              ? 'border-amber-600 text-amber-700 bg-amber-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-amber-600" />
          <span>当期仕入付随費用 ({currentIncidentalCosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('pending')}
          className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'pending'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>未決済・契約中 ({pendingPurchases.length})</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-b-lg border border-slate-200 border-t-0 shadow-2xs p-3 overflow-hidden print:border-none print:shadow-none print:p-0">
        {subTab === 'sales' && (
          <div className="overflow-x-auto">
            {currentSales.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                当期に決済された売上レコードはありません。
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th
                      className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('date')}
                      title="決済日で並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>決済日</span>
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
                    <th className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px]">
                      取得日
                    </th>
                    <th
                      className="py-1.5 px-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('code')}
                      title="物件コードで並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>物件コード・物件所在地</span>
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
                    <th className="py-1.5 px-2.5">区画・売却区分</th>
                    <th className="py-1.5 px-2.5">買主名</th>
                    <th className="py-1.5 px-2.5 text-right">土地面積</th>
                    <th className="py-1.5 px-2.5 text-right">建物面積</th>
                    <th className="py-1.5 px-2.5 text-right">土地売上 (精算金含)</th>
                    <th className="py-1.5 px-2.5 text-right">建物売上 (精算金含)</th>
                    <th className="py-1.5 px-2.5 text-right font-bold">売上総額</th>
                    <th className="py-1.5 px-2.5 text-center no-print">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSales.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 col-date font-mono font-bold text-slate-900 whitespace-nowrap w-[105px] min-w-[105px]">
                        {s.settlementDate}
                      </td>
                      <td className="py-1.5 px-2.5 col-date font-mono text-slate-700 whitespace-nowrap w-[105px] min-w-[105px]">
                        {s.purchaseSettlementDate}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                        <span className="font-mono text-slate-500 font-bold mr-1">
                          [{s.property.code}]
                        </span>
                        {s.property.location || s.property.name}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {s.saleName}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="font-medium text-slate-800">{s.buyerName}</div>
                        {s.buyerAddress && s.buyerAddress !== '-' && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.buyerAddress}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        {s.landAreaDisplay}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        {s.buildingAreaDisplay}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        <div className="font-bold">{formatCurrency(s.landPriceWithTax)}</div>
                        {s.taxLand > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            内精算金: {formatCurrency(s.taxLand)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        <div className="font-bold">{formatCurrency(s.buildingPriceWithTax)}</div>
                        {s.taxBldg > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            内精算金: {formatCurrency(s.taxBldg)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(s.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer text-xs"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {currentSales.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-center text-slate-700">
                        当期売上 合計 ({currentSales.length}件)
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                        {(() => {
                          const total = currentSales.reduce((sum, s) => sum + (s.landAreaNum || 0), 0);
                          return total > 0 ? `${total.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡` : '-';
                        })()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                        {(() => {
                          const total = currentSales.reduce((sum, s) => sum + (s.buildingAreaNum || 0), 0);
                          return total > 0 ? `${total.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} ㎡` : '-';
                        })()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(currentSales.reduce((sum, s) => sum + s.landPriceWithTax, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(currentSales.reduce((sum, s) => sum + s.buildingPriceWithTax, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-emerald-800">
                        {formatCurrency(currentSales.reduce((sum, s) => sum + s.totalAmount, 0))}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}

        {subTab === 'purchases' && (
          <div className="overflow-x-auto">
            {currentPurchases.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                当期に決済された仕入物件はありません。
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th
                      className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('date')}
                      title="決済日で並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>決済日</span>
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
                    <th
                      className="py-1.5 px-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('code')}
                      title="物件コードで並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>物件コード・物件所在地</span>
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
                    <th className="py-1.5 px-2.5">仕入先 (売主)</th>
                    <th className="py-1.5 px-2.5 text-right">土地仕入 (精算金含)</th>
                    <th className="py-1.5 px-2.5 text-right">建物仕入 (精算金含)</th>
                    <th className="py-1.5 px-2.5 text-right">精算金合計</th>
                    <th className="py-1.5 px-2.5 text-right">仕入本体計</th>
                    <th className="py-1.5 px-2.5 text-right">付随費用計</th>
                    <th className="py-1.5 px-2.5 text-right font-bold">総仕入原価</th>
                    <th className="py-1.5 px-2.5 text-center no-print">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentPurchases.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 col-date font-mono font-bold text-slate-900 whitespace-nowrap w-[105px] min-w-[105px]">
                        {p.settlementDate}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className="font-mono text-slate-500 font-bold">
                            [{p.property.code}]
                          </span>
                          {(() => {
                            const badge = getPropertyTypeBadgeClass(p.property.propertyType);
                            return (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="font-semibold text-slate-800">
                          {p.property.location || p.property.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {p.property.landCategory && <span>地目: {p.property.landCategory}</span>}
                          {p.property.landArea ? (
                            <span className={p.property.landCategory ? 'ml-1.5' : ''}>
                              土地: {p.property.landArea}㎡
                            </span>
                          ) : null}
                          {p.property.buildingArea ? (
                            <span className="ml-1.5">建物: {p.property.buildingArea}㎡</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="font-medium text-slate-800">{p.sellerName}</div>
                        {p.sellerAddress && p.sellerAddress !== '-' && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.sellerAddress}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        <div className="font-bold">{formatCurrency(p.landPriceWithTax)}</div>
                        {p.taxLand > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            内精算金: {formatCurrency(p.taxLand)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-800">
                        <div className="font-bold">{formatCurrency(p.buildingPriceWithTax)}</div>
                        {p.taxBldg > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            内精算金: {formatCurrency(p.taxBldg)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(p.fixedAssetTax)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-blue-700">
                        {formatCurrency(p.totalBasePrice)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(p.incidentalCostTotal)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.totalCost)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(p.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer text-xs"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {currentPurchases.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-2 px-2.5 text-center text-slate-700">
                        当期仕入 合計 ({currentPurchases.length}件)
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.landPriceWithTax, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.buildingPriceWithTax, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.fixedAssetTax, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-blue-800">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.totalBasePrice, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.incidentalCostTotal, 0))}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(currentPurchases.reduce((sum, p) => sum + p.totalCost, 0))}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}

        {subTab === 'costs' && (
          <div className="overflow-x-auto">
            {currentIncidentalCosts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                当期に支払われた仕入付随費用はありません。
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th
                      className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('date')}
                      title="支払日で並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>支払日</span>
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
                    <th
                      className="py-1.5 px-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('code')}
                      title="物件コードで並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>物件コード・物件名</span>
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
                    <th className="py-1.5 px-2.5">費用の種類</th>
                    <th className="py-1.5 px-2.5">相手先 (支払先)</th>
                    <th className="py-1.5 px-2.5 text-right">金額</th>
                    <th className="py-1.5 px-2.5">備考</th>
                    <th className="py-1.5 px-2.5 text-center no-print">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentIncidentalCosts.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 col-date font-mono font-bold text-slate-900 whitespace-nowrap w-[105px] min-w-[105px]">
                        {c.paymentDate}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                        <span className="font-mono text-slate-500 font-bold mr-1">
                          [{c.property.code}]
                        </span>
                        {c.property.name}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.costType}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700">{c.payee}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-500">{c.memo || '-'}</td>
                      <td className="py-1.5 px-2.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(c.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer text-xs"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {subTab === 'pending' && (
          <div className="overflow-x-auto">
            {pendingPurchases.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                現在、仕入未決済の物件はありません。
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th
                      className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('date')}
                      title="契約日で並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>契約日</span>
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
                    <th
                      className="py-1.5 px-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('code')}
                      title="物件コードで並び替え (昇順/降順)"
                    >
                      <div className="flex items-center space-x-1">
                        <span>物件コード・物件名</span>
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
                    <th className="py-1.5 px-2.5">現在の状態</th>
                    <th className="py-1.5 px-2.5 text-right">契約金額</th>
                    <th className="py-1.5 px-2.5 text-right">手付金額</th>
                    <th className="py-1.5 px-2.5 col-date whitespace-nowrap w-[105px] min-w-[105px]">手付金支払日</th>
                    <th className="py-1.5 px-2.5 text-center no-print">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingPurchases.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-1.5 px-2.5 col-date font-mono font-bold text-slate-900 whitespace-nowrap w-[105px] min-w-[105px]">
                        {p.contractDate}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                        <span className="font-mono text-slate-500 font-bold mr-1">
                          [{p.property.code}]
                        </span>
                        {p.property.name}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {p.statusLabel}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.contractPrice)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-blue-700 font-semibold">
                        {formatCurrency(p.depositAmount)}
                      </td>
                      <td className="py-1.5 px-2.5 col-date font-mono text-slate-600 whitespace-nowrap w-[105px] min-w-[105px]">
                        {p.depositDate || '未支払'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(p.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer text-xs"
                        >
                          決済日を入力
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
