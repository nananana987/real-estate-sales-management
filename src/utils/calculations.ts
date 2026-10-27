import {
  Property,
  PropertyType,
  PropertyFinancials,
  PropertyStatus,
  FiscalYear,
  AccountingMatchSummary,
  SaleRecord,
  PurchaseRecord,
  IncidentalCost,
} from '../types';

export const SQM_TO_TSUBO = 0.3025;

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '¥0';
  const rounded = Math.round(amount);
  if (rounded < 0) {
    return '-¥' + Math.abs(rounded).toLocaleString('ja-JP');
  }
  return '¥' + rounded.toLocaleString('ja-JP');
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
 * 個別の仕入レコードの固定資産税等精算金を取得
 */
export function getPurchaseRecordFixedAssetTax(
  p: Pick<
    PurchaseRecord,
    | 'fixedAssetTaxSettlementLand'
    | 'fixedAssetTaxSettlementBuilding'
    | 'fixedAssetTaxSettlementBuildingTax'
    | 'fixedAssetTaxSettlement'
  >
): { land: number; building: number; buildingTax: number; total: number } {
  const land = p.fixedAssetTaxSettlementLand || 0;
  const building = p.fixedAssetTaxSettlementBuilding || 0;
  const buildingTax = p.fixedAssetTaxSettlementBuildingTax || 0;
  const total =
    land + building + buildingTax > 0
      ? land + building + buildingTax
      : p.fixedAssetTaxSettlement || 0;
  return {
    land:
      land > 0
        ? land
        : building === 0 && p.fixedAssetTaxSettlement
        ? p.fixedAssetTaxSettlement
        : 0,
    building,
    buildingTax,
    total,
  };
}

/**
 * 物件に紐づく仕入レコード一覧を取得（旧データ・単一仕入データとの完全互換）
 */
export function getPropertyPurchases(property: Property): PurchaseRecord[] {
  if (property.purchases && property.purchases.length > 0) {
    return property.purchases;
  }
  const bldgGross =
    (property.buildingPurchasePrice || 0) + (property.buildingPurchaseTax || 0);
  const bldgTaxGross =
    (property.fixedAssetTaxSettlementBuilding || 0) +
    (property.fixedAssetTaxSettlementBuildingTax || 0);
  const landTax =
    property.fixedAssetTaxSettlementLand !== undefined
      ? property.fixedAssetTaxSettlementLand || 0
      : !property.fixedAssetTaxSettlementBuilding
      ? property.fixedAssetTaxSettlement || 0
      : 0;
  return [
    {
      id: `${property.id || 'prop'}-purchase-1`,
      propertyId: property.id,
      sellerName: property.sellerName || '',
      sellerAddress: property.sellerAddress || '',
      purchaseType: property.propertyType,
      landArea: property.landArea || undefined,
      buildingArea: property.buildingArea || undefined,
      contractDate: property.contractDate || '',
      landPurchasePrice: property.landPurchasePrice || 0,
      buildingPurchasePrice: bldgGross,
      buildingPurchaseTax: 0,
      settlementDate: property.settlementDate,
      depositAmount: property.depositAmount || 0,
      depositSettlementDate: property.depositSettlementDate,
      fixedAssetTaxSettlementLand: landTax,
      fixedAssetTaxSettlementBuilding: bldgTaxGross,
      fixedAssetTaxSettlementBuildingTax: 0,
      fixedAssetTaxSettlement: landTax + bldgTaxGross,
    },
  ];
}

/**
 * 物件に紐づく全ての添付ファイル（物件全体・各仕入・各付随費用・各売上）の総件数を取得
 */
export function getPropertyTotalAttachmentsCount(property: Property): number {
  const propCount = property.attachments?.length || 0;
  const purchasesCount = (property.purchases || []).reduce(
    (sum, p) => sum + (p.attachments?.length || 0),
    0
  );
  const costsCount = (property.incidentalCosts || []).reduce(
    (sum, c) => sum + (c.attachments?.length || 0),
    0
  );
  const salesCount = (property.sales || []).reduce(
    (sum, s) => sum + (s.attachments?.length || 0),
    0
  );
  return propCount + purchasesCount + costsCount + salesCount;
}

/**
 * 固定資産税等精算金の合計を取得 (全仕入レコードの合算)
 */
export function getPurchaseFixedAssetTax(property: Property): { land: number; building: number; buildingTax: number; total: number } {
  const purchases = getPropertyPurchases(property);
  return purchases.reduce(
    (acc, p) => {
      const t = getPurchaseRecordFixedAssetTax(p);
      acc.land += t.land;
      acc.building += t.building;
      acc.buildingTax += t.buildingTax;
      acc.total += t.total;
      return acc;
    },
    { land: 0, building: 0, buildingTax: 0, total: 0 }
  );
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

  const purchases = getPropertyPurchases(property);
  const settledPurchases = purchases.filter(p => Boolean(p.settlementDate && p.settlementDate.trim()));
  const hasSettledPurchase =
    settledPurchases.length > 0 || Boolean(property.settlementDate && property.settlementDate.trim());
  const hasDepositPaid =
    !hasSettledPurchase &&
    (purchases.some(p => Boolean(p.depositSettlementDate && p.depositSettlementDate.trim())) ||
      Boolean(property.depositSettlementDate && property.depositSettlementDate.trim()));
  const settledSales = (property.sales || []).filter(s =>
    Boolean(s.settlementDate && s.settlementDate.trim())
  );

  // 決済済みの仕入原価合計（未決済の仕入・未払の付随費用は除く）
  const settledPurchaseCost = settledPurchases.reduce((sum, p) => {
    const pTax = getPurchaseRecordFixedAssetTax(p);
    return (
      sum +
      (p.landPurchasePrice || 0) +
      (p.buildingPurchasePrice || 0) +
      (p.buildingPurchaseTax || 0) +
      pTax.total
    );
  }, 0);
  const settledIncidentalCost = (property.incidentalCosts || [])
    .filter(c => Boolean(c.paymentDate && c.paymentDate.trim()))
    .reduce((acc, c) => acc + (c.amount || 0), 0);

  const initialInventoryCost = property.initialInventoryCost || 0;
  const hasInventoryBase = hasSettledPurchase || initialInventoryCost > 0;
  const settledBaseCost = hasInventoryBase
    ? initialInventoryCost + settledPurchaseCost + settledIncidentalCost
    : 0;

  const settledCOGS = settledSales.reduce((acc, s) => acc + (s.costOfGoodsSold || 0), 0);
  const remainingInventory = Math.max(0, settledBaseCost - settledCOGS);
  const hasUnsettledPurchase = purchases.some(
    p =>
      !p.settlementDate ||
      (!p.settlementDate.trim() &&
        ((p.landPurchasePrice || 0) > 0 || (p.buildingPurchasePrice || 0) > 0))
  );

  // 1. 売却済み判定:
  // - 決済済みの売上があり、かつ全部売却フラグ または (未決済仕入がなく残棚卸高が0)
  if (settledSales.length > 0) {
    const hasFullSale = settledSales.some(s => s.saleCategory === 'full');
    if (hasFullSale || (!hasUnsettledPurchase && remainingInventory === 0 && settledBaseCost > 0)) {
      return { status: 'sold_out', label: '売却済み (完売)' };
    }
    return { status: 'partially_sold', label: '一部売却済み (残あり)' };
  }

  // 契約済みの売上があるが未決済の場合、まだ仕入側の状態をベースにする
  if (hasSettledPurchase || initialInventoryCost > 0) {
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

/**
 * 物件が対象事業年度(fy)の「前期以前」に売却済み（完売）となったかを判定
 * - 完売物件で、かつすべての売却決済日が当期開始日より前、あるいは所属期が前期以前の場合にtrue
 */
export function isPropertySoldInPriorPeriod(
  property: Property,
  fy: FiscalYear,
  fiscalYears?: FiscalYear[]
): boolean {
  const { status } = determinePropertyStatus(property);
  if (status !== 'sold_out') {
    return false;
  }

  const sales = property.sales || [];
  const settledSales = sales.filter(s => !!s.settlementDate);

  // 1. 決済日がある売上による判定
  if (settledSales.length > 0) {
    // 当期内に決済売上がある場合は当期売却なので、前期以前ではない
    const hasCurrentSale = settledSales.some(s => isDateInFiscalYear(s.settlementDate, fy));
    if (hasCurrentSale) {
      return false;
    }

    // すべての売上決済日が当期開始日より前なら、前期以前に売却済み
    const allBeforeCurrent = settledSales.every(s => isDateBeforeFiscalYear(s.settlementDate, fy));
    if (allBeforeCurrent) {
      return true;
    }
  }

  // 2. 契約日での判定（決済日が空の場合）
  const datedSales = sales.filter(s => !!(s.settlementDate || s.contractDate));
  if (datedSales.length > 0) {
    const hasCurrentSale = datedSales.some(s => {
      const d = s.settlementDate || s.contractDate;
      return isDateInFiscalYear(d, fy);
    });
    if (hasCurrentSale) {
      return false;
    }

    const allBeforeCurrent = datedSales.every(s => {
      const d = s.settlementDate || s.contractDate;
      return isDateBeforeFiscalYear(d, fy);
    });
    if (allBeforeCurrent) {
      return true;
    }
  }

  // 3. 所属事業年度（fiscalYearId）による判定
  if (property.fiscalYearId && fiscalYears && fiscalYears.length > 0) {
    const propFY = fiscalYears.find(f => f.id === property.fiscalYearId);
    if (propFY && propFY.periodNumber < fy.periodNumber) {
      return true;
    }
  }

  // 4. 仕入決済日も前期以前で、当期取引が一切ない場合
  if (isDateBeforeFiscalYear(property.settlementDate, fy)) {
    return true;
  }

  return false;
}

/**
 * 物件が対象事業年度(fy)の「当期中」に売却済み（完売）となったかを判定
 */
export function isPropertySoldInCurrentPeriod(
  property: Property,
  fy: FiscalYear,
  fiscalYears?: FiscalYear[]
): boolean {
  const { status } = determinePropertyStatus(property);
  if (status !== 'sold_out') {
    return false;
  }
  return !isPropertySoldInPriorPeriod(property, fy, fiscalYears);
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
 * ※未決済の仕入金額（settlementDateが空）および未払の付随費用（paymentDateが空）、
 *   ならびに未決済物件の付随費用は期末棚卸残高（endingInventory）には含めない
 */
export function calculatePropertyFinancials(property: Property, fy: FiscalYear): PropertyFinancials {
  const { status, label } = determinePropertyStatus(property);

  // 面積坪換算
  const landAreaTsubo = (property.landArea || 0) * SQM_TO_TSUBO;
  const buildingAreaTsubo = (property.buildingArea || 0) * SQM_TO_TSUBO;

  const purchases = getPropertyPurchases(property);
  const purchaseTax = getPurchaseFixedAssetTax(property);

  const landPurchaseTotal = purchases.reduce((sum, p) => sum + (p.landPurchasePrice || 0), 0);
  const buildingPurchaseTotal = purchases.reduce(
    (sum, p) => sum + (p.buildingPurchasePrice || 0) + (p.buildingPurchaseTax || 0),
    0
  );

  // 仕入基本合計 (土地 + 建物 + 固定資産税精算金) [未決済含む全契約]
  const purchaseBaseTotal = landPurchaseTotal + buildingPurchaseTotal + purchaseTax.total;

  // 付随費用累計 [未払含む全体]
  const incidentalCostsTotal = (property.incidentalCosts || []).reduce(
    (acc, c) => acc + (c.amount || 0),
    0
  );

  // 前期繰越原価 (もし繰越物件なら)
  const initialInventoryCost = property.initialInventoryCost || 0;

  // 総仕入原価 [未決済・未払含む全体]
  const totalAcquisitionCost = initialInventoryCost + purchaseBaseTotal + incidentalCostsTotal;

  // --- 決済済みの仕入金額 & 支払済みの付随費用（棚卸計上対象） ---
  const settledPurchases = purchases.filter(p => Boolean(p.settlementDate && p.settlementDate.trim()));
  const settledPurchaseBaseTotal = settledPurchases.reduce((sum, p) => {
    const pTax = getPurchaseRecordFixedAssetTax(p);
    return (
      sum +
      (p.landPurchasePrice || 0) +
      (p.buildingPurchasePrice || 0) +
      (p.buildingPurchaseTax || 0) +
      pTax.total
    );
  }, 0);
  const unsettledPurchaseTotal = Math.max(0, purchaseBaseTotal - settledPurchaseBaseTotal);

  const paidIncidentalCosts = (property.incidentalCosts || []).filter(c =>
    Boolean(c.paymentDate && c.paymentDate.trim())
  );
  const settledIncidentalCostsTotal = paidIncidentalCosts.reduce(
    (acc, c) => acc + (c.amount || 0),
    0
  );
  const unpaidIncidentalCostsTotal = incidentalCostsTotal - settledIncidentalCostsTotal;

  // 物件自体に決済済みの仕入（または前期繰越残高）があるか
  const hasSettledInventoryBase = settledPurchases.length > 0 || initialInventoryCost > 0;
  const isUnsettledProperty =
    !hasSettledInventoryBase ||
    status === 'contracted_unsettled' ||
    status === 'deposit_paid';

  // 棚卸算定ベースとなる決済済総仕入原価（未決済の仕入金額や未払の付随費用、未決済物件の費用は含めない）
  const settledAcquisitionCost = isUnsettledProperty
    ? 0
    : initialInventoryCost + settledPurchaseBaseTotal + settledIncidentalCostsTotal;

  // 売上累計
  const sales = property.sales || [];
  const totalSalesAmount = sales.reduce((acc, s) => {
    const sTax = getSaleFixedAssetTax(s);
    return acc + (s.landPrice || 0) + (s.buildingPrice || 0) + sTax.total;
  }, 0);

  // 決済済みの売上
  const settledSales = sales.filter(s => Boolean(s.settlementDate && s.settlementDate.trim()));
  const settledSalesAmount = settledSales.reduce((acc, s) => {
    const sTax = getSaleFixedAssetTax(s);
    return acc + (s.landPrice || 0) + (s.buildingPrice || 0) + sTax.total;
  }, 0);

  // 計上売上原価累計（決済済の売上のみ対象。未決済の売上は期末棚卸高から控除しない）
  const settledCostOfGoodsSold = settledSales.reduce((acc, s) => acc + (s.costOfGoodsSold || 0), 0);
  const totalCostOfGoodsSold = settledCostOfGoodsSold;

  // 現在の期末棚卸残高 (完売時または未決済時は0、それ以外は決済済仕入原価から決済済計上売上原価を控除した残高)
  const endingInventory =
    status === 'sold_out' || isUnsettledProperty
      ? 0
      : Math.max(0, settledAcquisitionCost - settledCostOfGoodsSold);

  // 粗利 (決済ベース)
  const grossProfit = settledSalesAmount - settledCostOfGoodsSold;
  const grossProfitMargin = settledSalesAmount > 0 ? (grossProfit / settledSalesAmount) * 100 : 0;

  // --- 当期判定 (事業年度 fy に基づく計算) ---
  // 1. 当期仕入 (各仕入レコードの決済日が当期内にある場合)
  let currentPeriodPurchase = 0;
  let isPurchasedInCurrentPeriod = false;
  purchases.forEach(p => {
    if (isDateInFiscalYear(p.settlementDate, fy)) {
      const pTax = getPurchaseRecordFixedAssetTax(p);
      const pBase =
        (p.landPurchasePrice || 0) +
        (p.buildingPurchasePrice || 0) +
        (p.buildingPurchaseTax || 0) +
        pTax.total;
      currentPeriodPurchase += pBase;
      isPurchasedInCurrentPeriod = true;
    }
  });

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

  // 4. 当期末棚卸物件か (当期末時点で在庫残高がある)
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
    settledPurchaseBaseTotal,
    settledIncidentalCostsTotal,
    settledAcquisitionCost,
    unsettledPurchaseTotal,
    unpaidIncidentalCostsTotal,
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
    const purchases = getPropertyPurchases(property);

    // 1. 期首棚卸高の集計 (前期からの繰越残高)
    if (property.initialInventoryCost && property.initialInventoryCost > 0) {
      beginningInventoryTotal += property.initialInventoryCost;
    } else {
      // もし前期以前に決済され、前期末時点で売却されていなかった場合の仕入原価
      const prevPurchases = purchases.filter(p => isDateBeforeFiscalYear(p.settlementDate, fy));
      if (prevPurchases.length > 0) {
        const prevBase = prevPurchases.reduce((sum, p) => {
          const pTax = getPurchaseRecordFixedAssetTax(p);
          return (
            sum +
            (p.landPurchasePrice || 0) +
            (p.buildingPurchasePrice || 0) +
            (p.buildingPurchaseTax || 0) +
            pTax.total
          );
        }, 0);
        // 前期以前の付随費用
        const prevCosts = (property.incidentalCosts || [])
          .filter(c => isDateBeforeFiscalYear(c.paymentDate, fy))
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        // 前期以前の売上原価
        const prevCOGS = (property.sales || [])
          .filter(s => isDateBeforeFiscalYear(s.settlementDate, fy))
          .reduce((sum, s) => sum + (s.costOfGoodsSold || 0), 0);

        const carriedBalance = Math.max(0, prevBase + prevCosts - prevCOGS);
        if (carriedBalance > 0 && !property.initialInventoryCost) {
          beginningInventoryTotal += carriedBalance;
        }
      }
    }

    // 2. 当期仕入科目 (各仕入レコードの決済日が当期内)
    purchases.forEach(p => {
      if (isDateInFiscalYear(p.settlementDate, fy)) {
        const pTax = getPurchaseRecordFixedAssetTax(p);
        purchaseLandTotal += p.landPurchasePrice || 0;
        purchaseBuildingTotal += (p.buildingPurchasePrice || 0) + (p.buildingPurchaseTax || 0);
        purchaseFixedAssetTaxLandTotal += pTax.land;
        purchaseFixedAssetTaxBuildingTotal += pTax.building + pTax.buildingTax;
        purchaseFixedAssetTaxTotal += pTax.total;
      }
    });

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

/**
 * 現在設定されている事業年度（または会社決算月）から新年度の開始日・終了日・期数を自動算出
 * @param currentFY 現在の事業年度（決算繰越元）
 * @param fiscalMonth 会社情報で設定されている決算月（1〜12）
 */
export function calculateNextFiscalYearDates(
  currentFY?: FiscalYear | null,
  fiscalMonth?: number
): { startDate: string; endDate: string; periodNumber: number } {
  // 1. 現在の事業年度(currentFY)の情報が存在する場合
  if (currentFY && currentFY.endDate) {
    const endParts = currentFY.endDate.split('-').map(Number);
    if (endParts.length === 3 && !endParts.some(isNaN)) {
      const [endY, endM, endD] = endParts;

      // 新年度開始日は現事業年度終了日（期末日）の「翌日」
      const nextStartObj = new Date(Date.UTC(endY, endM - 1, endD + 1));
      const nextStartStr = nextStartObj.toISOString().slice(0, 10);

      // 新年度終了日は現事業年度終了日の「ちょうど1年後」
      const targetYear = endY + 1;
      const targetMonth = endM;
      // 月末日の調整（閏年2/29 -> 2/28、または31日/30日）
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
      const targetDay = Math.min(endD, daysInTargetMonth);

      const nextEndStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      const periodNumber = (currentFY.periodNumber || 1) + 1;

      return {
        startDate: nextStartStr,
        endDate: nextEndStr,
        periodNumber,
      };
    }
  }

  // 2. フォールバック: 会社情報の決算月（未設定時は3月）をもとに算出
  const month = fiscalMonth && fiscalMonth >= 1 && fiscalMonth <= 12 ? fiscalMonth : 3;
  const now = new Date();
  const currentYear = now.getFullYear();

  const daysInMonth = new Date(Date.UTC(currentYear, month, 0)).getUTCDate();
  const startMonth = month === 12 ? 1 : month + 1;
  const startYear = month === 12 ? currentYear : currentYear - 1;

  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const endDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  return {
    startDate,
    endDate,
    periodNumber: 1,
  };
}

/**
 * 開始日(YYYY-MM-DD)が変更された際、1年間の通常事業年度終了日を自動算出
 */
export function estimateFiscalYearEndDate(startDate: string): string {
  const parts = startDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [startY, startM, startD] = parts;

  if (startD === 1) {
    // 月初開始の場合 (例: 2026-10-01 -> 2027-09-30)
    const prevMonth = startM === 1 ? 12 : startM - 1;
    const endYear = startM === 1 ? startY : startY + 1;
    const lastDay = new Date(Date.UTC(endYear, prevMonth, 0)).getUTCDate();
    return `${endYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // 月中日開始の場合 (例: 2026-10-15 -> 2027-10-14)
  const targetYear = startY + 1;
  const prevDateObj = new Date(Date.UTC(targetYear, startM - 1, startD - 1));
  return prevDateObj.toISOString().slice(0, 10);
}
