import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Calendar,
  Building,
  ArrowRight,
  TrendingUp,
  Receipt,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  calculateAccountingSummary,
  calculatePropertyFinancials,
  formatCurrency,
  isDateInFiscalYear,
} from '../utils/calculations';
import { downloadCSV } from '../utils/storage';

interface AccountingCheckViewProps {
  properties: Property[];
  currentFY: FiscalYear;
  onSelectProperty: (property: Property) => void;
}

export const AccountingCheckView: React.FC<AccountingCheckViewProps> = ({
  properties,
  currentFY,
  onSelectProperty,
}) => {
  const summary = calculateAccountingSummary(properties, currentFY);

  // Accounting Software Trial Balance Input (for comparison)
  const [tbPurchase, setTbPurchase] = useState<number | ''>('');
  const [tbLandSales, setTbLandSales] = useState<number | ''>('');
  const [tbBuildingSales, setTbBuildingSales] = useState<number | ''>('');
  const [tbCOGS, setTbCOGS] = useState<number | ''>('');
  const [tbEndingInventory, setTbEndingInventory] = useState<number | ''>('');

  // Active Sub-tab for detailed breakdown
  const [breakdownTab, setBreakdownTab] = useState<'purchase' | 'sales' | 'cogs' | 'inventory'>('purchase');

  // Breakdown items for the current fiscal year
  // 1. 仕入科目明細 (決済日または支払日が当期内)
  const purchaseItems: {
    date: string;
    propertyCode: string;
    propertyName: string;
    accountSubtype: string;
    partner: string;
    amount: number;
    memo: string;
    property: Property;
  }[] = [];

  // 2. 売上科目明細 (決済日が当期内)
  const salesItems: {
    date: string;
    propertyCode: string;
    propertyName: string;
    accountType: '土地売上' | '建物売上';
    buyer: string;
    amount: number;
    memo: string;
    cogs: number;
    property: Property;
  }[] = [];

  // 3. 期末棚卸明細
  const inventoryItems: {
    propertyCode: string;
    propertyName: string;
    status: string;
    initialCost: number;
    currentPurchase: number;
    currentCOGS: number;
    endingInventory: number;
    property: Property;
  }[] = [];

  properties.forEach(prop => {
    const fin = calculatePropertyFinancials(prop, currentFY);

    // 仕入本体 (当期決済)
    if (isDateInFiscalYear(prop.settlementDate, currentFY)) {
      if (prop.landPurchasePrice > 0) {
        purchaseItems.push({
          date: prop.settlementDate!,
          propertyCode: prop.code,
          propertyName: prop.name,
          accountSubtype: '仕入 (土地本体)',
          partner: prop.sellerName || '売主',
          amount: prop.landPurchasePrice,
          memo: `地目: ${prop.landCategory} / 面積: ${prop.landArea}㎡`,
          property: prop,
        });
      }
      if (prop.buildingPurchasePrice > 0) {
        purchaseItems.push({
          date: prop.settlementDate!,
          propertyCode: prop.code,
          propertyName: prop.name,
          accountSubtype: '仕入 (建物本体)',
          partner: prop.sellerName || '売主',
          amount: prop.buildingPurchasePrice,
          memo: `建物面積: ${prop.buildingArea || 0}㎡`,
          property: prop,
        });
      }
      const pTaxLand = fin.purchaseFixedAssetTaxLand;
      const pTaxBldg = fin.purchaseFixedAssetTaxBuilding + fin.purchaseFixedAssetTaxBuildingTax;

      if (pTaxLand > 0) {
        purchaseItems.push({
          date: prop.settlementDate!,
          propertyCode: prop.code,
          propertyName: prop.location,
          accountSubtype: '仕入 (固定資産税等精算金・土地分)',
          partner: prop.sellerName || '売主',
          amount: pTaxLand,
          memo: '公租公課精算金 (非課税・仕入原価算入)',
          property: prop,
        });
      }
      if (pTaxBldg > 0) {
        purchaseItems.push({
          date: prop.settlementDate!,
          propertyCode: prop.code,
          propertyName: prop.location,
          accountSubtype: '仕入 (固定資産税等精算金・建物分)',
          partner: prop.sellerName || '売主',
          amount: pTaxBldg,
          memo: '公租公課精算金 (課税・仕入原価算入)',
          property: prop,
        });
      }
    }

    // 付随費用 (当期支払)
    (prop.incidentalCosts || []).forEach(cost => {
      if (isDateInFiscalYear(cost.paymentDate, currentFY)) {
        purchaseItems.push({
          date: cost.paymentDate,
          propertyCode: prop.code,
          propertyName: prop.location,
          accountSubtype: `仕入 (${cost.costType})`,
          partner: cost.payee || '支払先',
          amount: cost.amount,
          memo: cost.memo || '',
          property: prop,
        });
      }
    });

    // 売上 (当期決済)
    (prop.sales || []).forEach(sale => {
      if (isDateInFiscalYear(sale.settlementDate, currentFY)) {
        const sTaxLand = sale.fixedAssetTaxSettlementLand || 0;
        const sTaxBldg = (sale.fixedAssetTaxSettlementBuilding || 0) + (sale.fixedAssetTaxSettlementBuildingTax || 0);
        const legacyTax = (!sale.fixedAssetTaxSettlementLand && !sale.fixedAssetTaxSettlementBuilding) ? (sale.fixedAssetTaxSettlement || 0) : 0;

        const landTotal = (sale.landPrice || 0) + sTaxLand + legacyTax;
        const bldgTotal = (sale.buildingPrice || 0) + sTaxBldg;

        if (landTotal > 0) {
          salesItems.push({
            date: sale.settlementDate!,
            propertyCode: prop.code,
            propertyName: prop.location,
            accountType: '土地売上',
            buyer: sale.buyerName,
            amount: landTotal,
            memo: `${sale.partialSaleName ? `[${sale.partialSaleName}] ` : ''}${sTaxLand > 0 || legacyTax > 0 ? '土地精算金含む' : ''}`,
            cogs: sale.costOfGoodsSold || 0,
            property: prop,
          });
        }
        if (bldgTotal > 0) {
          salesItems.push({
            date: sale.settlementDate!,
            propertyCode: prop.code,
            propertyName: prop.location,
            accountType: '建物売上',
            buyer: sale.buyerName,
            amount: bldgTotal,
            memo: `${sale.partialSaleName ? `[${sale.partialSaleName}] ` : ''}${sTaxBldg > 0 ? '建物精算金含む' : '建物売上'}`,
            cogs: 0,
            property: prop,
          });
        }
      }
    });

    // 棚卸
    if (fin.endingInventory > 0 || fin.currentPeriodPurchase > 0 || fin.currentPeriodCOGS > 0) {
      inventoryItems.push({
        propertyCode: prop.code,
        propertyName: prop.location,
        status: fin.statusLabel,
        initialCost: prop.initialInventoryCost || 0,
        currentPurchase: fin.currentPeriodPurchase,
        currentCOGS: fin.currentPeriodCOGS,
        endingInventory: fin.endingInventory,
        property: prop,
      });
    }
  });

  // Sort purchase & sales items by date
  purchaseItems.sort((a, b) => a.date.localeCompare(b.date));
  salesItems.sort((a, b) => a.date.localeCompare(b.date));

  // CSV Export for accounting reconciliation
  const handleExportReconciliationCSV = () => {
    let csv = `事業年度,${currentFY.name}\n`;
    csv += `集計期間,${currentFY.startDate} 〜 ${currentFY.endDate}\n\n`;

    csv += `【科目別集計結果】\n`;
    csv += `勘定科目,当システム集計額(円),会計ソフト試算表(円),差異(円)\n`;
    csv += `「仕入」科目 (本体+付随費用),${summary.totalPurchaseAccount},${tbPurchase === '' ? '' : tbPurchase},${
      tbPurchase === '' ? 0 : Number(tbPurchase) - summary.totalPurchaseAccount
    }\n`;
    csv += `「土地売上」科目,${summary.salesLandTotal},${tbLandSales === '' ? '' : tbLandSales},${
      tbLandSales === '' ? 0 : Number(tbLandSales) - summary.salesLandTotal
    }\n`;
    csv += `「建物売上」科目,${summary.salesBuildingTotal},${tbBuildingSales === '' ? '' : tbBuildingSales},${
      tbBuildingSales === '' ? 0 : Number(tbBuildingSales) - summary.salesBuildingTotal
    }\n`;
    csv += `「売上原価」科目,${summary.costOfGoodsSoldTotal},${tbCOGS === '' ? '' : tbCOGS},${
      tbCOGS === '' ? 0 : Number(tbCOGS) - summary.costOfGoodsSoldTotal
    }\n`;
    csv += `「期末商品棚卸高」科目,${summary.endingInventoryTotal},${tbEndingInventory === '' ? '' : tbEndingInventory},${
      tbEndingInventory === '' ? 0 : Number(tbEndingInventory) - summary.endingInventoryTotal
    }\n\n`;

    csv += `【当期「仕入」科目計上明細】\n`;
    csv += `決済日/支払日,物件コード,物件名,内訳科目,相手先,金額(円),備考\n`;
    purchaseItems.forEach(item => {
      csv += `"${item.date}","${item.propertyCode}","${item.propertyName}","${item.accountSubtype}","${item.partner}",${item.amount},"${item.memo}"\n`;
    });

    csv += `\n【当期「売上」科目計上明細】\n`;
    csv += `決済日/入金日,物件コード,物件名,勘定科目,買主,金額(円),計上売上原価(円),備考\n`;
    salesItems.forEach(item => {
      csv += `"${item.date}","${item.propertyCode}","${item.propertyName}","${item.accountType}","${item.buyer}",${item.amount},${item.cogs},"${item.memo}"\n`;
    });

    downloadCSV(`会計科目突合明細_${currentFY.periodNumber}期_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  // Difference checks
  const diffPurchase = tbPurchase !== '' ? Number(tbPurchase) - summary.totalPurchaseAccount : null;
  const diffLandSales = tbLandSales !== '' ? Number(tbLandSales) - summary.salesLandTotal : null;
  const diffBuildingSales = tbBuildingSales !== '' ? Number(tbBuildingSales) - summary.salesBuildingTotal : null;
  const diffCOGS = tbCOGS !== '' ? Number(tbCOGS) - summary.costOfGoodsSoldTotal : null;
  const diffEndingInv = tbEndingInventory !== '' ? Number(tbEndingInventory) - summary.endingInventoryTotal : null;

  return (
    <div className="space-y-3.5">
      {/* Top Banner with Fiscal Year and Description */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {currentFY.name}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              （{currentFY.startDate} 〜 {currentFY.endDate}）
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 tracking-tight">
            会計ソフト勘定科目との一致照合 (当期決算照合)
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            当期決済日（支払日・入金日）に基づき、「仕入」「土地売上」「建物売上」「売上原価」「期末棚卸高」を自動集計し試算表と突合します。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportReconciliationCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>突合明細 CSV出力</span>
          </button>
        </div>
      </div>

      {/* 5 Core Accounting Accounts Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold tracking-tight">
              科目別 突合判定テーブル (システム集計 vs 会計ソフト試算表)
            </h3>
          </div>
          <span className="text-[10px] text-slate-300">
            右側の入力欄に会計ソフトの試算表残高を入力すると即座に差異を検証できます
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3.5">勘定科目</th>
                <th className="py-2 px-2.5">当システム集計ルール</th>
                <th className="py-2 px-3.5 text-right">当システム集計金額 (A)</th>
                <th className="py-2 px-3.5 text-right w-48">会計ソフト試算表残高 (B)</th>
                <th className="py-2 px-3.5 text-right w-36">差額 (B - A)</th>
                <th className="py-2 px-2.5 text-center w-24">判定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-xs">
              {/* 1. 仕入科目 */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>「仕入」科目</span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-500">
                  当期決済の土地・建物仕入 ＋ 固定資産税精算金 ＋ 当期支払付随費用
                </td>
                <td className="py-2 px-3.5 text-right font-bold text-sm text-blue-700 font-mono">
                  {formatCurrency(summary.totalPurchaseAccount)}
                </td>
                <td className="py-2 px-3.5 text-right">
                  <div className="relative">
                    <input
                      type="number"
                      value={tbPurchase}
                      onChange={e => setTbPurchase(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="試算表の仕入高"
                      className="w-full px-2.5 py-1 text-xs text-right bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-bold"
                    />
                  </div>
                </td>
                <td
                  className={`py-2 px-3.5 text-right font-bold text-xs font-mono ${
                    diffPurchase === null
                      ? 'text-slate-400'
                      : diffPurchase === 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {diffPurchase === null ? '-' : formatCurrency(diffPurchase)}
                </td>
                <td className="py-2 px-2.5 text-center">
                  {diffPurchase === null ? (
                    <span className="text-[10px] text-slate-400">未入力</span>
                  ) : diffPurchase === 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      一致 ✓
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      差異あり
                    </span>
                  )}
                </td>
              </tr>

              {/* 2. 土地売上科目 */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>「土地売上」科目</span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-500">
                  当期決済の土地売上高 ＋ 土地固定資産税等精算金(受取)
                </td>
                <td className="py-2 px-3.5 text-right font-bold text-sm text-emerald-700 font-mono">
                  {formatCurrency(summary.salesLandTotal)}
                </td>
                <td className="py-2 px-3.5 text-right">
                  <input
                    type="number"
                    value={tbLandSales}
                    onChange={e => setTbLandSales(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="試算表の土地売上"
                    className="w-full px-2.5 py-1 text-xs text-right bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-bold"
                  />
                </td>
                <td
                  className={`py-2 px-3.5 text-right font-bold text-xs font-mono ${
                    diffLandSales === null
                      ? 'text-slate-400'
                      : diffLandSales === 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {diffLandSales === null ? '-' : formatCurrency(diffLandSales)}
                </td>
                <td className="py-2 px-2.5 text-center">
                  {diffLandSales === null ? (
                    <span className="text-[10px] text-slate-400">未入力</span>
                  ) : diffLandSales === 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      一致 ✓
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      差異あり
                    </span>
                  )}
                </td>
              </tr>

              {/* 3. 建物売上科目 */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    <span>「建物売上」科目</span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-500">
                  当期決済の建物売上高 (税抜/本体)
                </td>
                <td className="py-2 px-3.5 text-right font-bold text-sm text-teal-700 font-mono">
                  {formatCurrency(summary.salesBuildingTotal)}
                </td>
                <td className="py-2 px-3.5 text-right">
                  <input
                    type="number"
                    value={tbBuildingSales}
                    onChange={e =>
                      setTbBuildingSales(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="試算表の建物売上"
                    className="w-full px-2.5 py-1 text-xs text-right bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-bold"
                  />
                </td>
                <td
                  className={`py-2 px-3.5 text-right font-bold text-xs font-mono ${
                    diffBuildingSales === null
                      ? 'text-slate-400'
                      : diffBuildingSales === 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {diffBuildingSales === null ? '-' : formatCurrency(diffBuildingSales)}
                </td>
                <td className="py-2 px-2.5 text-center">
                  {diffBuildingSales === null ? (
                    <span className="text-[10px] text-slate-400">未入力</span>
                  ) : diffBuildingSales === 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      一致 ✓
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      差異あり
                    </span>
                  )}
                </td>
              </tr>

              {/* 4. 売上原価科目 */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    <span>「売上原価」科目</span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-500">
                  当期決済された売上に対する計上売上原価の合計
                </td>
                <td className="py-2 px-3.5 text-right font-bold text-sm text-amber-700 font-mono">
                  {formatCurrency(summary.costOfGoodsSoldTotal)}
                </td>
                <td className="py-2 px-3.5 text-right">
                  <input
                    type="number"
                    value={tbCOGS}
                    onChange={e => setTbCOGS(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="試算表の売上原価"
                    className="w-full px-2.5 py-1 text-xs text-right bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-bold"
                  />
                </td>
                <td
                  className={`py-2 px-3.5 text-right font-bold text-xs font-mono ${
                    diffCOGS === null
                      ? 'text-slate-400'
                      : diffCOGS === 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {diffCOGS === null ? '-' : formatCurrency(diffCOGS)}
                </td>
                <td className="py-2 px-2.5 text-center">
                  {diffCOGS === null ? (
                    <span className="text-[10px] text-slate-400">未入力</span>
                  ) : diffCOGS === 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      一致 ✓
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      差異あり
                    </span>
                  )}
                </td>
              </tr>

              {/* 5. 期末商品棚卸高 */}
              <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                <td className="py-2 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>「期末商品棚卸高」</span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-500">
                  期首棚卸 ({formatCurrency(summary.beginningInventoryTotal)}) ＋ 当期仕入 (
                  {formatCurrency(summary.totalPurchaseAccount)}) － 当期売上原価 (
                  {formatCurrency(summary.costOfGoodsSoldTotal)})
                </td>
                <td className="py-2 px-3.5 text-right font-bold text-sm text-purple-700 font-mono">
                  {formatCurrency(summary.endingInventoryTotal)}
                </td>
                <td className="py-2 px-3.5 text-right">
                  <input
                    type="number"
                    value={tbEndingInventory}
                    onChange={e =>
                      setTbEndingInventory(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="決算書の棚卸高"
                    className="w-full px-2.5 py-1 text-xs text-right bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-bold"
                  />
                </td>
                <td
                  className={`py-2 px-3.5 text-right font-bold text-xs font-mono ${
                    diffEndingInv === null
                      ? 'text-slate-400'
                      : diffEndingInv === 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {diffEndingInv === null ? '-' : formatCurrency(diffEndingInv)}
                </td>
                <td className="py-2 px-2.5 text-center">
                  {diffEndingInv === null ? (
                    <span className="text-[10px] text-slate-400">未入力</span>
                  ) : diffEndingInv === 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      一致 ✓
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      差異あり
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounting Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 仕入科目内訳 */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">当期「仕入」科目 内訳</span>
            </div>
            <span className="text-xs font-bold text-blue-700 font-mono">
              {formatCurrency(summary.totalPurchaseAccount)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">土地仕入本体:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.purchaseLandTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">建物仕入本体:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.purchaseBuildingTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">固定資産税等精算金(支払):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.purchaseFixedAssetTaxTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-0.5">
              <span className="text-[11px]">仕入付随費用合計:</span>
              <span className="font-semibold text-blue-700 font-mono">
                {formatCurrency(summary.incidentalCostsTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 売上科目内訳 */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">当期「売上」科目 内訳</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              {formatCurrency(summary.totalSales)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">土地売上 (非課税):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.salesLandTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">建物売上 (課税対象):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.salesBuildingTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-0.5">
              <span className="text-[11px]">当期売上総利益 (粗利):</span>
              <span className="font-bold text-emerald-700 font-mono">
                {formatCurrency(summary.grossProfit)} ({summary.profitMargin.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 棚卸原価バランス */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-bold text-slate-900">棚卸原価バランス方程式</span>
            </div>
            <span className="text-xs font-bold text-purple-700 font-mono">
              残高 {formatCurrency(summary.endingInventoryTotal)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">期首棚卸高 (+):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.beginningInventoryTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">当期仕入高 (+):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(summary.totalPurchaseAccount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-[11px]">当期売上原価 (-):</span>
              <span className="font-semibold text-amber-700 font-mono">
                {formatCurrency(summary.costOfGoodsSoldTotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-0.5">
              <span className="text-[11px]">＝ 期末商品棚卸高:</span>
              <span className="text-purple-700 font-mono">{formatCurrency(summary.endingInventoryTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Transaction Breakdown Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Breakdown Tabs */}
        <div className="flex border-b border-slate-200 px-3 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setBreakdownTab('purchase')}
            className={`py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              breakdownTab === 'purchase'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            当期「仕入」明細 ({purchaseItems.length}件 / {formatCurrency(summary.totalPurchaseAccount)})
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab('sales')}
            className={`py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              breakdownTab === 'sales'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            当期「売上」明細 ({salesItems.length}件 / {formatCurrency(summary.totalSales)})
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab('inventory')}
            className={`py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              breakdownTab === 'inventory'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            当期末「棚卸資産」明細 ({inventoryItems.length}物件 / {formatCurrency(summary.endingInventoryTotal)})
          </button>
        </div>

        {/* Breakdown Table Body */}
        <div className="p-3">
          {breakdownTab === 'purchase' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5">決済日/支払日</th>
                    <th className="py-2 px-2.5">物件コード・物件名</th>
                    <th className="py-2 px-2.5">内訳区分</th>
                    <th className="py-2 px-2.5">相手先 (売主/業者)</th>
                    <th className="py-2 px-2.5 text-right">金額 (円)</th>
                    <th className="py-2 px-2.5">備考</th>
                    <th className="py-2 px-2.5 text-center w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40">
                      <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-800 text-[11px]">
                        {item.date}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="font-mono text-slate-500 font-bold mr-1 text-[10px]">
                          [{item.propertyCode}]
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{item.propertyName}</span>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {item.accountSubtype}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700 text-[11px]">{item.partner}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono text-xs">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-500 text-[11px]">{item.memo || '-'}</td>
                      <td className="py-1.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(item.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold text-xs cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {breakdownTab === 'sales' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5">決済日/入金日</th>
                    <th className="py-2 px-2.5">物件コード・物件名</th>
                    <th className="py-2 px-2.5">科目区分</th>
                    <th className="py-2 px-2.5">売上先 (買主)</th>
                    <th className="py-2 px-2.5 text-right">売上金額 (円)</th>
                    <th className="py-2 px-2.5 text-right">計上売上原価 (円)</th>
                    <th className="py-2 px-2.5">備考</th>
                    <th className="py-2 px-2.5 text-center w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40">
                      <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-800 text-[11px]">
                        {item.date}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="font-mono text-slate-500 font-bold mr-1 text-[10px]">
                          [{item.propertyCode}]
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{item.propertyName}</span>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.accountType}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800 text-[11px]">{item.buyer}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700 font-mono text-xs">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-amber-700 font-mono text-xs">
                        {formatCurrency(item.cogs)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-500 text-[11px]">{item.memo || '-'}</td>
                      <td className="py-1.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(item.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold text-xs cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {breakdownTab === 'inventory' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5">物件コード</th>
                    <th className="py-2 px-2.5">物件名</th>
                    <th className="py-2 px-2.5">状態</th>
                    <th className="py-2 px-2.5 text-right">期首繰越原価</th>
                    <th className="py-2 px-2.5 text-right">当期仕入(付随込)</th>
                    <th className="py-2 px-2.5 text-right">当期売上原価</th>
                    <th className="py-2 px-2.5 text-right">期末棚卸残高</th>
                    <th className="py-2 px-2.5 text-center w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40">
                      <td className="py-1.5 px-2.5 font-mono font-bold text-slate-600 text-[10px]">
                        {item.propertyCode}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-slate-800 text-xs">{item.propertyName}</td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 text-xs">
                        {formatCurrency(item.initialCost)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-blue-700 font-semibold text-xs">
                        {formatCurrency(item.currentPurchase)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-amber-700 font-semibold text-xs">
                        {formatCurrency(item.currentCOGS)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-purple-700 text-xs">
                        {formatCurrency(item.endingInventory)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectProperty(item.property)}
                          className="text-blue-600 hover:text-blue-900 font-bold text-xs cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
