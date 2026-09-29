import {
  Property,
  PropertyType,
  PropertyFinancials,
  PropertyStatus,
  FiscalYear,
  AccountingMatchSummary,
  SaleRecord,
  IncidentalCost,
} from '../types';

export const SQM_TO_TSUBO = 0.3025;

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '¥0';
  return '¥' + Math.round(amount).toLocaleString('ja-JP');
}

export function formatArea(sqm: number | undefined | null): { sqm: string; tsubo: string } {
  if (sqm === undefined || sqm === null || isNaN(sqm)) {
    return { sqm: '0.00 ㎡', tsubo: '0.00 坪' };
  }
  const tsubo = sqm * SQM_TO_TSUBO;
  return {
    sqm: `${sqm.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ㎡`,
    tsubo: `${tsubo.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 坪`,
  };
}

/**
 * 仕入先氏名をフォーマット（複数人いる場合は最初の一人だけ表示し「○○他」とする）
 */
export function formatSellerDisplayName(sellerName?: string | null): string {
  if (!sellerName || !sellerName.trim()) {
    return '-';
  }
  const trimmed = sellerName.trim();

  // すでに「他」「外」「等」が付いている場合 (例: "山田太郎 他", "山田太郎他2名", "山田太郎 外1名")
  const alreadyEtcMatch = trimmed.match(/^(.+?)\s*(?:他|外|等)(?:\s*\d+名)?$/u);
  if (alreadyEtcMatch) {
    const main = alreadyEtcMatch[1].trim();
    return main ? `${main}他` : trimmed;
  }

  // 明確な複数人区切り文字（改行、読点、カンマ、スラッシュ、セミコロン）で分割
  const multiParts = trimmed.split(/[\n\r,、，/／;；]+/).map(s => s.trim()).filter(Boolean);
  if (multiParts.length > 1) {
    return `${multiParts[0]}他`;
  }

  // 中黒「・」で区切られている場合の判定（例: "山田太郎・鈴木花子"）
  if (trimmed.includes('・')) {
    const dotParts = trimmed.split('・').map(s => s.trim()).filter(Boolean);
    if (dotParts.length > 1 && !/^[A-Za-z\s]+$/.test(trimmed)) {
      return `${dotParts[0]}他`;
    }
  }

  // 単独の氏名または法人名
  return trimmed;
}

/**
 * 土地・建物の種類（PropertyType）の日本語ラベルを取得
 */
export function getPropertyTypeLabel(type?: PropertyType | string | null): string {
  switch (type) {
    case 'land':
      return '土地のみ';
    case 'building':
      return '建物のみ';
    case 'land_and_building':
      return '土地＋建物';
    default:
      return '土地のみ';
  }
}

/**
 * 土地・建物の種類バッジ用スタイル
 */
export function getPropertyTypeBadgeClass(type?: PropertyType | string | null): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (type) {
    case 'land':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        label: '土地のみ',
      };
    case 'building':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: '建物のみ',
      };
    case 'land_and_building':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        label: '土地＋建物',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: '土地のみ',
      };
  }
}

/**
 * 日付が対象事業年度の期間内にあるかを判定
 */
export function isDateInFiscalYear(dateStr: string | undefined | null, fy: FiscalYear): boolean {
  if (!dateStr) return false;
  return dateStr >= fy.startDate && dateStr <= fy.endDate;
}

/**
 * 日付が事業年度開始日より前か（前期以前か）を判定
 */
export function isDateBeforeFiscalYear(dateStr: string | undefined | null, fy: FiscalYear): boolean {
  if (!dateStr) return false;
  return dateStr < fy.startDate;
}

/**
 * 固定資産税等精算金の合計を取得 (土地分 + 建物分 + 建物消費税 または 合計値)
 */
export function getPurchaseFixedAssetTax(property: Property): { land: number; building: number; buildingTax: number; total: number } {
  const land = property.fixedAssetTaxSettlementLand || 0;
  const building = property.fixedAssetTaxSettlementBuilding || 0;
  const buildingTax = property.fixedAssetTaxSettlementBuildingTax || 0;
  const total = (land + building + buildingTax) > 0 ? (land + building + buildingTax) : (property.fixedAssetTaxSettlement || 0);
  return {
    land: land > 0 ? land : (building === 0 && property.fixedAssetTaxSettlement ? property.fixedAssetTaxSettlement : 0),
    building,
    buildingTax,
    total,
  };
}

export function getSaleFixedAssetTax(sale: SaleRecord): { land: number; building: number; buildingTax: number; total: number } {
  const land = sale.fixedAssetTaxSettlementLand || 0;
  const building = sale.fixedAssetTaxSettlementBuilding || 0;
  const buildingTax = sale.fixedAssetTaxSettlementBuildingTax || 0;
  const total = (land + building + buildingTax) > 0 ? (land + building + buildingTax) : (sale.fixedAssetTaxSettlement || 0);
  return {
    land: land > 0 ? land : (building === 0 && sale.fixedAssetTaxSettlement ? sale.fixedAssetTaxSettlement : 0),
    building,
    buildingTax,
    total,
  };
}

/**
 * 物件のステータスを自動判定
 */
export function determinePropertyStatus(property: Property): { status: PropertyStatus; label: string } {
  if (property.statusOverride) {
    return {
      status: property.statusOverride,
      label: getStatusLabel(property.statusOverride),
    };
  }

  const hasSettledPurchase = !!property.settlementDate;
  const hasDepositPaid = !!property.depositSettlementDate && !property.settlementDate;
  const settledSales = (property.sales || []).filter(s => !!s.settlementDate);
  const purchaseTax = getPurchaseFixedAssetTax(property);

  // 総原価
  const baseCost = (property.initialInventoryCost || 0) +
    (property.landPurchasePrice || 0) +
    (property.buildingPurchasePrice || 0) +
    purchaseTax.total +
    (property.incidentalCosts || []).reduce((acc, c) => acc + (c.amount || 0), 0);

  const totalCOGS = (property.sales || []).reduce((acc, s) => acc + (s.costOfGoodsSold || 0), 0);
  const remainingInventory = Math.max(0, baseCost - totalCOGS);

  // 1. 売却済み判定:
  // - 決済済みの売上があり、かつ全部売却フラグ または 残棚卸高が実質0(100円未満)
  if (settledSales.length > 0) {
    const hasFullSale = settledSales.some(s => s.saleCategory === 'full');
    if (hasFullSale || remainingInventory === 0) {
      return { status: 'sold_out', label: '売却済み (完売)' };
    }
    return { status: 'partially_sold', label: '一部売却済み (残あり)' };
  }

  // 契約済みの売上があるが未決済の場合、まだ仕入側の状態をベースにする
  if (hasSettledPurchase) {
    return { status: 'inventory', label: '決済済み (棚卸・保有中)' };
  }

  if (hasDepositPaid) {
    return { status: 'deposit_paid', label: '手付金支払済 (決済待ち)' };
  }

  return { status: 'contracted_unsettled', label: '仕入契約済 (未決済)' };
}

export function getStatusLabel(status: PropertyStatus): string {
  switch (status) {
    case 'contracted_unsettled':
      return '仕入契約済 (未決済)';
    case 'deposit_paid':
      return '手付金支払済 (決済待ち)';
    case 'inventory':
      return '決済済み (棚卸・保有中)';
    case 'partially_sold':
      return '一部売却済み (残あり)';
    case 'sold_out':
      return '売却済み (完売)';
    default:
      return '不明';
  }
}

export function getStatusBadgeClass(status: PropertyStatus): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'contracted_unsettled':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    case 'deposit_paid':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
      };
    case 'inventory':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    case 'partially_sold':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
      };
    case 'sold_out':
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
      };
  }
}

/**
 * 物件の各種金額・当期取引金額・棚卸金額を精密計算
 */
export function calculatePropertyFinancials(property: Property, fy: FiscalYear): PropertyFinancials {
  const { status, label } = determinePropertyStatus(property);

  // 面積坪換算
  const landAreaTsubo = (property.landArea || 0) * SQM_TO_TSUBO;
  const buildingAreaTsubo = (property.buildingArea || 0) * SQM_TO_TSUBO;

  const purchaseTax = getPurchaseFixedAssetTax(property);

  // 仕入基本合計 (土地 + 建物 + 固定資産税精算金)
  const purchaseBaseTotal =
    (property.landPurchasePrice || 0) +
    (property.buildingPurchasePrice || 0) +
    purchaseTax.total;

  // 付随費用累計
  const incidentalCostsTotal = (property.incidentalCosts || []).reduce(
    (acc, c) => acc + (c.amount || 0),
    0
  );

  // 前期繰越原価 (もし繰越物件なら)
  const initialInventoryCost = property.initialInventoryCost || 0;

  // 総仕入原価
  const totalAcquisitionCost = initialInventoryCost + purchaseBaseTotal + incidentalCostsTotal;

  // 売上累計
  const sales = property.sales || [];
  const totalSalesAmount = sales.reduce((acc, s) => {
    const sTax = getSaleFixedAssetTax(s);
    return acc + (s.landPrice || 0) + (s.buildingPrice || 0) + sTax.total;
  }, 0);

  // 決済済みの売上
  const settledSales = sales.filter(s => !!s.settlementDate);
  const settledSalesAmount = settledSales.reduce((acc, s) => {
    const sTax = getSaleFixedAssetTax(s);
    return acc + (s.landPrice || 0) + (s.buildingPrice || 0) + sTax.total;
  }, 0);

  // 計上売上原価累計
  const totalCostOfGoodsSold = sales.reduce((acc, s) => acc + (s.costOfGoodsSold || 0), 0);

  // 現在の棚卸金額 (完売時は0、一部売却時は控除後残高)
  const endingInventory = status === 'sold_out' ? 0 : Math.max(0, totalAcquisitionCost - totalCostOfGoodsSold);

  // 粗利 (決済ベース)
  const grossProfit = settledSalesAmount - totalCostOfGoodsSold;
  const grossProfitMargin = settledSalesAmount > 0 ? (grossProfit / settledSalesAmount) * 100 : 0;

  // --- 当期判定 (事業年度 fy に基づく計算) ---
  // 1. 当期仕入 (仕入本体の決済日が当期内にある場合)
  let currentPeriodPurchase = 0;
  let isPurchasedInCurrentPeriod = false;
  if (isDateInFiscalYear(property.settlementDate, fy)) {
    currentPeriodPurchase += purchaseBaseTotal;
    isPurchasedInCurrentPeriod = true;
  }

  // 2. 当期付随費用 (支払日が当期内にある費用)
  (property.incidentalCosts || []).forEach(cost => {
    if (isDateInFiscalYear(cost.paymentDate, fy)) {
      currentPeriodPurchase += cost.amount || 0;
    }
  });

  // 3. 当期売上 (決済日が当期内にある売上)
  let currentPeriodSalesLand = 0;
  let currentPeriodSalesBuilding = 0;
  let currentPeriodSalesTotal = 0;
  let currentPeriodCOGS = 0;
  let isSoldInCurrentPeriod = false;

  sales.forEach(sale => {
    if (isDateInFiscalYear(sale.settlementDate, fy)) {
      isSoldInCurrentPeriod = true;
      const sTax = getSaleFixedAssetTax(sale);
      const landWithTax = (sale.landPrice || 0) + sTax.land;
      const buildingWithTax = (sale.buildingPrice || 0) + sTax.building + sTax.buildingTax;
      currentPeriodSalesLand += landWithTax;
      currentPeriodSalesBuilding += buildingWithTax;
      currentPeriodSalesTotal += (sale.landPrice || 0) + (sale.buildingPrice || 0) + sTax.total;
      currentPeriodCOGS += sale.costOfGoodsSold || 0;
    }
  });

  // 4. 当期末棚卸物件か (当期末時点で在庫残高がある、または当期中に決済されて在庫化している)
  const isInventoryInCurrentPeriod = endingInventory > 0;

  return {
    status,
    statusLabel: label,
    landAreaTsubo,
    buildingAreaTsubo,
    purchaseBaseTotal,
    purchaseFixedAssetTaxLand: purchaseTax.land,
    purchaseFixedAssetTaxBuilding: purchaseTax.building,
    purchaseFixedAssetTaxBuildingTax: purchaseTax.buildingTax,
    purchaseFixedAssetTaxTotal: purchaseTax.total,
    incidentalCostsTotal,
    totalAcquisitionCost,
    totalSalesAmount,
    settledSalesAmount,
    totalCostOfGoodsSold,
    endingInventory,
    grossProfit,
    grossProfitMargin,
    currentPeriodPurchase,
    currentPeriodSalesLand,
    currentPeriodSalesBuilding,
    currentPeriodSalesTotal,
    currentPeriodCOGS,
    isPurchasedInCurrentPeriod,
    isSoldInCurrentPeriod,
    isInventoryInCurrentPeriod,
  };
}

/**
 * 事業年度全体の会計科目突合サマリーを計算
 */
export function calculateAccountingSummary(properties: Property[], fy: FiscalYear): AccountingMatchSummary {
  let purchaseLandTotal = 0;
  let purchaseBuildingTotal = 0;
  let purchaseFixedAssetTaxLandTotal = 0;
  let purchaseFixedAssetTaxBuildingTotal = 0;
  let purchaseFixedAssetTaxTotal = 0;
  let incidentalCostsTotal = 0;

  let salesLandTotal = 0;
  let salesBuildingTotal = 0;
  let salesFixedAssetTaxLandTotal = 0;
  let salesFixedAssetTaxBuildingTotal = 0;
  let salesFixedAssetTaxTotal = 0;

  let beginningInventoryTotal = 0;
  let costOfGoodsSoldTotal = 0;
  let endingInventoryTotal = 0;

  properties.forEach(property => {
    const pTax = getPurchaseFixedAssetTax(property);

    // 1. 期首棚卸高の集計 (前期からの繰越残高)
    if (property.initialInventoryCost && property.initialInventoryCost > 0) {
      beginningInventoryTotal += property.initialInventoryCost;
    } else {
      // もし前期以前に決済され、前期末時点で売却されていなかった場合の仕入原価
      if (isDateBeforeFiscalYear(property.settlementDate, fy)) {
        // 前期以前の付随費用
        const prevCosts = (property.incidentalCosts || [])
          .filter(c => isDateBeforeFiscalYear(c.paymentDate, fy))
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        // 前期以前の売上原価
        const prevCOGS = (property.sales || [])
          .filter(s => isDateBeforeFiscalYear(s.settlementDate, fy))
          .reduce((sum, s) => sum + (s.costOfGoodsSold || 0), 0);
        
        const prevBase = (property.landPurchasePrice || 0) + (property.buildingPurchasePrice || 0) + pTax.total;
        const carriedBalance = Math.max(0, prevBase + prevCosts - prevCOGS);
        if (carriedBalance > 0 && !property.initialInventoryCost) {
          beginningInventoryTotal += carriedBalance;
        }
      }
    }

    // 2. 当期仕入科目 (決済日が当期内)
    if (isDateInFiscalYear(property.settlementDate, fy)) {
      purchaseLandTotal += property.landPurchasePrice || 0;
      purchaseBuildingTotal += property.buildingPurchasePrice || 0;
      purchaseFixedAssetTaxLandTotal += pTax.land;
      purchaseFixedAssetTaxBuildingTotal += pTax.building + pTax.buildingTax;
      purchaseFixedAssetTaxTotal += pTax.total;
    }

    // 3. 当期付随費用 (支払日が当期内)
    (property.incidentalCosts || []).forEach(cost => {
      if (isDateInFiscalYear(cost.paymentDate, fy)) {
        incidentalCostsTotal += cost.amount || 0;
      }
    });

    // 4. 当期売上科目 & 当期売上原価 (売上決済日が当期内)
    (property.sales || []).forEach(sale => {
      if (isDateInFiscalYear(sale.settlementDate, fy)) {
        const sTax = getSaleFixedAssetTax(sale);
        const landTotalWithTax = (sale.landPrice || 0) + sTax.land;
        const bldgTotalWithTax = (sale.buildingPrice || 0) + sTax.building + sTax.buildingTax;
        salesLandTotal += landTotalWithTax;
        salesBuildingTotal += bldgTotalWithTax;
        salesFixedAssetTaxLandTotal += sTax.land;
        salesFixedAssetTaxBuildingTotal += sTax.building + sTax.buildingTax;
        salesFixedAssetTaxTotal += sTax.total;
        costOfGoodsSoldTotal += sale.costOfGoodsSold || 0;
      }
    });

    // 5. 各物件の期末棚卸金額
    const fin = calculatePropertyFinancials(property, fy);
    endingInventoryTotal += fin.endingInventory;
  });

  const totalPurchaseAccount =
    purchaseLandTotal + purchaseBuildingTotal + purchaseFixedAssetTaxTotal + incidentalCostsTotal;

  const totalSales = salesLandTotal + salesBuildingTotal;
  const grossProfit = totalSales - costOfGoodsSoldTotal;
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  return {
    fiscalYear: fy,
    purchaseLandTotal,
    purchaseBuildingTotal,
    purchaseFixedAssetTaxLandTotal,
    purchaseFixedAssetTaxBuildingTotal,
    purchaseFixedAssetTaxTotal,
    incidentalCostsTotal,
    totalPurchaseAccount,
    salesLandTotal,
    salesBuildingTotal,
    salesFixedAssetTaxLandTotal,
    salesFixedAssetTaxBuildingTotal,
    salesFixedAssetTaxTotal,
    totalSales,
    beginningInventoryTotal,
    costOfGoodsSoldTotal,
    endingInventoryTotal,
    grossProfit,
    profitMargin,
  };
}
