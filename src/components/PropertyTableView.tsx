import React, { useState } from 'react';
import {
  Building,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit,
  FileText,
  Trash2,
  ExternalLink,
  Layers,
  CheckCircle,
  Printer,
} from 'lucide-react';
import { Property, FiscalYear, CompanyInfo } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  formatArea,
  getStatusBadgeClass,
  getPurchaseFixedAssetTax,
  getSaleFixedAssetTax,
  getPropertyTypeBadgeClass,
} from '../utils/calculations';

interface PropertyTableViewProps {
  properties: Property[];
  currentFY: FiscalYear;
  companyInfo?: CompanyInfo;
  statusFilterLabel?: string;
  periodFilterLabel?: string;
  searchQuery?: string;
  onEditProperty: (property: Property) => void;
  onOpenDetail: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onPrint?: () => void;
}

export const PropertyTableView: React.FC<PropertyTableViewProps> = ({
  properties,
  currentFY,
  companyInfo,
  statusFilterLabel,
  periodFilterLabel,
  searchQuery,
  onEditProperty,
  onOpenDetail,
  onDeleteProperty,
  onPrint,
}) => {
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedPropertyIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedPropertyIds(next);
  };

  const isAllExpanded = properties.length > 0 && properties.every(p => expandedPropertyIds.has(p.id));

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedPropertyIds(new Set());
    } else {
      setExpandedPropertyIds(new Set(properties.map(p => p.id)));
    }
  };

  // Calculate table-level totals for footer
  const tableTotals = React.useMemo(() => {
    return properties.reduce(
      (acc, prop) => {
        const fin = calculatePropertyFinancials(prop, currentFY);
        acc.totalAcquisitionCost += fin.totalAcquisitionCost;
        acc.currentPeriodPurchase += fin.currentPeriodPurchase;
        acc.currentPeriodSalesTotal += fin.currentPeriodSalesTotal;
        acc.endingInventory += fin.endingInventory;
        acc.grossProfit += fin.grossProfit;
        return acc;
      },
      {
        totalAcquisitionCost: 0,
        currentPeriodPurchase: 0,
        currentPeriodSalesTotal: 0,
        endingInventory: 0,
        grossProfit: 0,
      }
    );
  }, [properties, currentFY]);

  const totalGrossProfitMargin =
    tableTotals.currentPeriodSalesTotal > 0
      ? (tableTotals.grossProfit / tableTotals.currentPeriodSalesTotal) * 100
      : 0;

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
        <Building className="w-12 h-12 mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">該当する物件が見つかりませんでした</p>
        <p className="text-xs text-slate-400">
          検索条件やフィルタを変更するか、「新規物件登録」から物件を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Print-Only Header (印刷時のみ表示) */}
      <div className="hidden print-only mb-3 border-b-2 border-slate-900 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              不動産物件一覧台帳 (仕入・売上・期末棚卸)
            </h1>
            <p className="text-xs text-slate-700 mt-0.5">
              対象事業年度: <span className="font-bold">{currentFY.name}</span>
              <span className="font-mono ml-2">（期間: {currentFY.startDate} 〜 {currentFY.endDate}）</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            {companyInfo?.name && (
              <p className="font-bold text-slate-800 text-sm">{companyInfo.name}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">
              印刷日: {new Date().toLocaleDateString('ja-JP')}{' '}
              {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Print Filter Conditions */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 mt-1 pt-1 border-t border-slate-200">
          <span>対象件数: <strong className="text-slate-900">{properties.length}件</strong></span>
          {statusFilterLabel && statusFilterLabel !== 'すべて' && (
            <span>状態区分: <strong className="text-slate-900">{statusFilterLabel}</strong></span>
          )}
          {periodFilterLabel && periodFilterLabel !== '全期間の物件' && (
            <span>期間区分: <strong className="text-slate-900">{periodFilterLabel}</strong></span>
          )}
          {searchQuery && (
            <span>検索キーワード: <strong className="text-slate-900">"{searchQuery}"</strong></span>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2 px-2 w-9 text-center no-print">
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title={isAllExpanded ? 'すべてのアコーディオンを閉じる' : 'すべてのアコーディオンを一括展開'}
                  >
                    {isAllExpanded ? (
                      <ChevronsDownUp className="w-3.5 h-3.5 text-blue-700 font-bold" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2.5">管理コード / 物件所在地</th>
                <th className="py-2.5 px-2.5">決済日</th>
                <th className="py-2.5 px-2.5">種類</th>
                <th className="py-2.5 px-2.5">地目・面積</th>
                <th className="py-2.5 px-2.5">現在の状態</th>
                <th className="py-2.5 px-2.5 text-right">総仕入原価</th>
                <th className="py-2.5 px-2.5 text-right text-blue-700">当期仕入合計</th>
                <th className="py-2.5 px-2.5 text-right text-emerald-700">当期売上合計</th>
                <th className="py-2.5 px-2.5 text-right text-indigo-700">期末棚卸残高</th>
                <th className="py-2.5 px-2.5 text-right">粗利益 (率)</th>
                <th className="py-2.5 px-2.5 text-center w-20 no-print">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property, pIdx) => {
                const fin = calculatePropertyFinancials(property, currentFY);
                const badgeStyle = getStatusBadgeClass(fin.status);
                const typeBadge = getPropertyTypeBadgeClass(property.propertyType);
                const landAreaFormatted = formatArea(property.landArea);
                const isExpanded = expandedPropertyIds.has(property.id);

                // 仕入内訳 (固定資産税等精算金を含む)
                const pTax = getPurchaseFixedAssetTax(property);
                const landPurchaseWithTax = (property.landPurchasePrice || 0) + pTax.land;
                const buildingPurchaseWithTax = (property.buildingPurchasePrice || 0) + pTax.building + pTax.buildingTax;

                // 売上累計の内訳 (固定資産税等精算金を含む)
                const salesSummary = (property.sales || []).reduce(
                  (acc, s) => {
                    const sTax = getSaleFixedAssetTax(s);
                    acc.landTotal += (s.landPrice || 0) + sTax.land;
                    acc.buildingTotal += (s.buildingPrice || 0) + sTax.building + sTax.buildingTax;
                    return acc;
                  },
                  { landTotal: 0, buildingTotal: 0 }
                );

                return (
                  <React.Fragment key={property.id}>
                    <tr
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isExpanded ? 'bg-slate-50/80' : ''
                      }`}
                    >
                      {/* Expand Toggle */}
                      <td className="py-2 px-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => toggleExpand(property.id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                          title={isExpanded ? '詳細を閉じる' : '内訳を表示'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Code & Location */}
                      <td className="py-2 px-2.5 print-text-full">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                            {property.code}
                          </span>
                          {/* Web表示時はボタンリンク */}
                          <button
                            type="button"
                            onClick={() => onOpenDetail(property)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate max-w-[240px] cursor-pointer text-xs no-print"
                            title={property.location}
                          >
                            {property.location || '所在地未設定'}
                          </button>
                          {/* 印刷時は非ボタンでフル表示 */}
                          <span className="hidden print:inline font-bold text-slate-900 text-xs">
                            {property.location || '所在地未設定'}
                          </span>
                        </div>
                        {property.name && property.name !== property.location && (
                          <p className="text-[10px] text-slate-400 print:text-slate-600 truncate max-w-[240px] print:max-w-none mt-0.5">
                            {property.name}
                          </p>
                        )}
                      </td>

                      {/* Settlement Date (決済日) */}
                      <td className="py-2 px-2.5 whitespace-nowrap font-mono text-xs">
                        {property.settlementDate ? (
                          <span className="font-semibold text-slate-800">{property.settlementDate}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">未決済</span>
                        )}
                      </td>

                      {/* Property Type (土地・建物の種類) */}
                      <td className="py-2 px-2.5 text-xs whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Area & Land Category */}
                      <td className="py-2 px-2.5 text-slate-700">
                        <div className="font-semibold text-slate-800 text-xs">{property.landCategory}</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {landAreaFormatted.sqm}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
                          <span>{fin.statusLabel}</span>
                        </span>
                        {property.isCarriedOver && (
                          <div className="text-[9px] text-amber-700 font-semibold mt-0.5">
                            [前期繰越]
                          </div>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-800 text-xs">
                        {formatCurrency(fin.totalAcquisitionCost)}
                      </td>

                      {/* Current Period Purchase */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-blue-700 bg-blue-50/20 text-xs">
                        {formatCurrency(fin.currentPeriodPurchase)}
                      </td>

                      {/* Current Period Sales */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 text-xs">
                        {formatCurrency(fin.currentPeriodSalesTotal)}
                      </td>

                      {/* Ending Inventory */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-purple-700 bg-purple-50/20 text-xs">
                        {formatCurrency(fin.endingInventory)}
                      </td>

                      {/* Gross Profit & Margin */}
                      <td className="py-2 px-2.5 text-right font-mono">
                        <div
                          className={`font-bold text-xs ${
                            fin.grossProfit > 0
                              ? 'text-emerald-700'
                              : fin.grossProfit < 0
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatCurrency(fin.grossProfit)}
                        </div>
                        {fin.settledSalesAmount > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {fin.grossProfitMargin.toFixed(1)}%
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2.5 text-center no-print">
                        <div className="flex items-center justify-center space-x-0.5">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(property)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="詳細収支計算書"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditProperty(property)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="編集"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`物件「${property.code} ${property.location}」を削除しますか？`)) {
                                onDeleteProperty(property.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Sub-details row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={12} className="p-3 border-b border-slate-200">
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3.5">
                            {/* 1. 仕入原価内訳 (本体 ＋ 付随費用) - 備考不要 */}
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                                <span>仕入原価内訳 (本体 ＋ 付随費用)</span>
                                <span className="font-mono text-slate-700 font-bold text-xs">
                                  総仕入原価: {formatCurrency(fin.totalAcquisitionCost)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#f8fafc] text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                                    <tr>
                                      <th className="py-1.5 px-3">科目 / 費用の種類</th>
                                      <th className="py-1.5 px-3">相手先 (支払先)</th>
                                      <th className="py-1.5 px-3">支払日 / 決済日</th>
                                      <th className="py-1.5 px-3 text-right">金額 (円)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {property.landPurchasePrice > 0 && (
                                      <tr className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-1.5 px-3 font-bold text-slate-800">土地仕入本体</td>
                                        <td className="py-1.5 px-3 text-slate-700">{property.sellerName || '-'}</td>
                                        <td className="py-1.5 px-3 font-mono text-slate-600">{property.settlementDate || '未決済'}</td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(property.landPurchasePrice)}
                                        </td>
                                      </tr>
                                    )}
                                    {property.buildingPurchasePrice > 0 && (
                                      <tr className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-1.5 px-3 font-bold text-slate-800">建物仕入本体</td>
                                        <td className="py-1.5 px-3 text-slate-700">{property.sellerName || '-'}</td>
                                        <td className="py-1.5 px-3 font-mono text-slate-600">{property.settlementDate || '未決済'}</td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(property.buildingPurchasePrice)}
                                        </td>
                                      </tr>
                                    )}
                                    {fin.purchaseFixedAssetTaxTotal > 0 && (
                                      <tr className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-1.5 px-3 font-bold text-slate-800">
                                          固定資産税等精算金 (支払)
                                          <span className="block text-[10px] font-normal text-slate-500">
                                            内訳: 土地(非課税) {formatCurrency(fin.purchaseFixedAssetTaxLand)} / 建物(税込) {formatCurrency(fin.purchaseFixedAssetTaxBuilding + fin.purchaseFixedAssetTaxBuildingTax)}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-700">{property.sellerName || '-'}</td>
                                        <td className="py-1.5 px-3 font-mono text-slate-600">{property.settlementDate || '-'}</td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(fin.purchaseFixedAssetTaxTotal)}
                                        </td>
                                      </tr>
                                    )}
                                    {(property.incidentalCosts || []).map(cost => (
                                      <tr key={cost.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-1.5 px-3 font-semibold text-blue-800">
                                          付随費用: {cost.costType}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-700">{cost.payee || '-'}</td>
                                        <td className="py-1.5 px-3 font-mono text-slate-600">{cost.paymentDate || '-'}</td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-700">
                                          {formatCurrency(cost.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                    {property.landPurchasePrice <= 0 && property.buildingPurchasePrice <= 0 && fin.purchaseFixedAssetTaxTotal <= 0 && (!property.incidentalCosts || property.incidentalCosts.length === 0) && (
                                      <tr>
                                        <td colSpan={4} className="py-3 px-3 text-center text-slate-400">
                                          仕入原価の内訳データは未登録です
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                    <tr>
                                      <td colSpan={3} className="py-2 px-3 text-right text-slate-700">
                                        総仕入原価合計:
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-900 font-mono">
                                        {formatCurrency(fin.totalAcquisitionCost)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* 2. 売上・分筆売却事績 - 売上原価・備考は不要 */}
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                                <span>売上・分筆売却事績 ({property.sales?.length || 0}件)</span>
                                <button
                                  type="button"
                                  onClick={() => onOpenDetail(property)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center space-x-1 no-print"
                                >
                                  <span>詳細収支計算書を開く</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                              {property.sales && property.sales.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                  {property.sales.map((sale, sIdx) => {
                                    const sTax = getSaleFixedAssetTax(sale);
                                    const sTotal = (sale.landPrice || 0) + (sale.buildingPrice || 0) + (sale.fixedAssetTaxSettlement || 0);

                                    return (
                                      <div key={sale.id} className="p-3 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                          <div className="flex items-center space-x-1.5">
                                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                                              {sIdx + 1}
                                            </span>
                                            <span className="font-bold text-slate-900 text-xs">
                                              {sale.buyerName || '買主未設定'} 様
                                            </span>
                                            {sale.partialSaleName && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                {sale.partialSaleName}
                                              </span>
                                            )}
                                            {sale.soldLandArea ? (
                                              <span className="text-[10px] text-slate-500 font-mono">
                                                (売却面積: {sale.soldLandArea}㎡)
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className="text-right">
                                            <span className="text-slate-500 mr-1.5 text-[11px]">売上総額:</span>
                                            <span className="font-mono font-bold text-emerald-700 text-xs">
                                              {formatCurrency(sTotal)}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-slate-600 bg-slate-50 p-2 rounded text-[11px]">
                                          <div>契約日: <span className="font-mono text-slate-800">{sale.contractDate || '-'}</span></div>
                                          <div>決済日: <span className="font-mono text-slate-800">{sale.settlementDate || '未決済'}</span></div>
                                          <div>土地売上: <span className="font-mono font-bold text-slate-800">{formatCurrency(sale.landPrice)}</span></div>
                                          <div>建物売上: <span className="font-mono font-bold text-slate-800">{formatCurrency(sale.buildingPrice)}</span></div>
                                        </div>
                                        {sTax.total > 0 && (
                                          <div className="text-[10px] text-slate-500 font-mono px-1">
                                            内 固定資産税等精算金: {formatCurrency(sTax.total)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-4 text-center text-slate-400 text-xs">
                                  売上レコードはまだ登録されていません。
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Summary Footer Row */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
              <tr>
                <td className="py-2.5 px-2 text-center no-print"></td>
                <td className="py-2.5 px-2.5">
                  <span className="font-bold text-slate-900">合計 ({properties.length}件)</span>
                </td>
                <td className="py-2.5 px-2.5 text-slate-500 font-normal text-[11px]">-</td>
                <td className="py-2.5 px-2.5 text-slate-500 font-normal text-[11px]">-</td>
                <td className="py-2.5 px-2.5 text-slate-500 font-normal text-[11px]">-</td>
                <td className="py-2.5 px-2.5 text-slate-500 font-normal text-[11px]">-</td>
                <td className="py-2.5 px-2.5 text-right font-mono text-slate-900">
                  {formatCurrency(tableTotals.totalAcquisitionCost)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono text-blue-800">
                  {formatCurrency(tableTotals.currentPeriodPurchase)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800">
                  {formatCurrency(tableTotals.currentPeriodSalesTotal)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono text-purple-800">
                  {formatCurrency(tableTotals.endingInventory)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono">
                  <div
                    className={
                      tableTotals.grossProfit >= 0 ? 'text-emerald-800' : 'text-red-700'
                    }
                  >
                    {formatCurrency(tableTotals.grossProfit)}
                  </div>
                  {tableTotals.currentPeriodSalesTotal > 0 && (
                    <div className="text-[10px] text-slate-500 font-normal">
                      平均 {totalGrossProfitMargin.toFixed(1)}%
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2.5 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

