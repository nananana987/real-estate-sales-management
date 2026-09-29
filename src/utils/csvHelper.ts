import { Property, PropertyType, LandCategory, IncidentalCost, IncidentalCostType } from '../types';
import { generateNextPropertyCode } from './codeGenerator';

/**
 * 物件CSVテンプレートの定義
 */
export const PROPERTY_CSV_TEMPLATE_HEADERS = [
  '管理コード',
  '物件所在地',
  '種類',
  '地目',
  '土地面積_㎡',
  '建物面積_㎡',
  '仕入先_売主名',
  '仕入先_住所',
  '仕入契約日',
  '土地仕入金額_非課税',
  '建物仕入金額_税込',
  '固定資産税精算金_土地分',
  '固定資産税精算金_建物分_税込',
  '仕入決済日',
  '手付金額',
  '手付金決済日',
  '期首繰越原価',
  '繰越メモ',
  '備考メモ',
];

/**
 * 付随費用CSVテンプレートの定義
 */
export const INCIDENTAL_COST_CSV_TEMPLATE_HEADERS = [
  '管理コード',
  '物件所在地',
  '費用区分',
  '相手先_支払先',
  '支払日',
  '金額_税込',
  '備考メモ',
];

// 互換用
export const CSV_TEMPLATE_HEADERS = PROPERTY_CSV_TEMPLATE_HEADERS;

/**
 * 物件CSVテンプレート文字列生成 (UTF-8 BOM付き)
 */
export function generatePropertyCsvTemplate(): string {
  const sampleRows = [
    [
      '26001',
      '東京都世田谷区代沢4丁目18-12',
      '土地',
      '宅地',
      '240.50',
      '',
      '鈴木 一郎',
      '東京都世田谷区代沢4-10-1',
      '2026-04-10',
      '120000000',
      '0',
      '180000',
      '0',
      '2026-05-20',
      '6000000',
      '2026-04-10',
      '0',
      '',
      '駅徒歩8分、南西角地',
    ],
    [
      '26002',
      '神奈川県横浜市青葉区美しが丘2丁目5-8',
      '土地建物',
      '宅地',
      '185.20',
      '112.40',
      '佐藤 太郎',
      '神奈川県横浜市青葉区美しが丘2-5-8',
      '2026-05-15',
      '55000000',
      '15400000',
      '120000',
      '44000',
      '2026-06-30',
      '3000000',
      '2026-05-15',
      '0',
      '',
      '中古戸建リノベ再販物件 (建物仕入税込1540万円)',
    ],
  ];

  const headerLine = PROPERTY_CSV_TEMPLATE_HEADERS.join(',');
  const rowLines = sampleRows.map(row =>
    row.map(cell => (cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
  );

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * 付随費用CSVテンプレート文字列生成 (UTF-8 BOM付き)
 */
export function generateIncidentalCostCsvTemplate(existingProperties?: Property[]): string {
  const code1 = existingProperties?.[0]?.code || '26001';
  const loc1 = existingProperties?.[0]?.location || '東京都世田谷区代沢4丁目18-12';
  const code2 = existingProperties?.[1]?.code || '26002';
  const loc2 = existingProperties?.[1]?.location || '神奈川県横浜市青葉区美しが丘2丁目5-8';

  const sampleRows = [
    [
      code1,
      loc1,
      '仲介手数料',
      '東急リバブル株式会社',
      '2026-05-20',
      '4026000',
      '仕入決済時仲介手数料 (税込)',
    ],
    [
      code1,
      loc1,
      '登記費用',
      '司法書士 鈴木法務事務所',
      '2026-05-20',
      '450000',
      '所有権移転登記および登録免許税',
    ],
    [
      code1,
      loc1,
      '解体費用',
      '株式会社東京解体工業',
      '2026-06-15',
      '2200000',
      '既存古家木造2階建 解体・滅失登記費用',
    ],
    [
      code1,
      loc1,
      '測量費用',
      '東都土地家屋調査士法人',
      '2026-06-30',
      '770000',
      '境界確定測量および分筆登記測量',
    ],
    [
      code2,
      loc2,
      '修繕・リフォーム費用',
      '株式会社デザインリノベーション',
      '2026-07-10',
      '5500000',
      '水回り設備更新およびクロス・フローリング張替工事',
    ],
    [
      code2,
      loc2,
      '印紙税',
      '世田谷郵便局',
      '2026-05-15',
      '30000',
      '売買契約書貼付印紙代',
    ],
  ];

  const headerLine = INCIDENTAL_COST_CSV_TEMPLATE_HEADERS.join(',');
  const rowLines = sampleRows.map(row =>
    row.map(cell => (cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
  );

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * 互換用テンプレート生成
 */
export function generateCsvTemplate(): string {
  return generatePropertyCsvTemplate();
}

/**
 * 物件用テンプレートCSVファイルをブラウザからダウンロード
 */
export function downloadPropertyCsvTemplate(): void {
  const csvContent = generatePropertyCsvTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `不動産物件取込用テンプレート_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 付随費用用テンプレートCSVファイルをブラウザからダウンロード
 */
export function downloadIncidentalCostCsvTemplate(existingProperties?: Property[]): void {
  const csvContent = generateIncidentalCostCsvTemplate(existingProperties);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `不動産付随費用取込用テンプレート_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsvTemplate(): void {
  downloadPropertyCsvTemplate();
}

/**
 * CSV行パーサー (カンマ区切り、ダブルクォート内のカンマ・改行・エスケープに対応)
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  // Remove potential leading BOM
  const cleanText = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      // Only push non-empty rows
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface ParsedCsvPropertyRow {
  rowIndex: number;
  code: string;
  location: string;
  propertyType: PropertyType;
  landCategory: string;
  landArea: number;
  buildingArea: number;
  sellerName: string;
  sellerAddress: string;
  contractDate: string;
  landPurchasePrice: number;
  buildingPurchasePrice: number;
  fixedAssetTaxLand: number;
  fixedAssetTaxBuilding: number;
  settlementDate: string;
  depositAmount: number;
  depositSettlementDate: string;
  isCarriedOver: boolean;
  initialInventoryCost: number;
  initialInventoryNote: string;
  notes: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  raw: Record<string, string>;
}

/**
 * ヘッダー名の正規化
 */
function normalizeHeaderName(header: string): string {
  return header
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[（\(\)）_・\s]/g, '')
    .toLowerCase();
}

/**
 * 日付文字列の正規化 (YYYY-MM-DD)
 */
function normalizeDate(val: string | undefined): string {
  if (!val) return '';
  const clean = val.trim().replace(/\//g, '-').replace(/\./g, '-');
  // 2026-4-1 -> 2026-04-01
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // 260401 or 20260401
  const numOnly = val.replace(/\D/g, '');
  if (numOnly.length === 8) {
    return `${numOnly.slice(0, 4)}-${numOnly.slice(4, 6)}-${numOnly.slice(6, 8)}`;
  }
  if (numOnly.length === 6) {
    return `20${numOnly.slice(0, 2)}-${numOnly.slice(2, 4)}-${numOnly.slice(4, 6)}`;
  }
  return clean;
}

/**
 * 金額・数値のパース
 */
function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  const clean = val.replace(/[¥,円\s]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * 物件種別の判定
 */
function parsePropertyType(val: string | undefined): PropertyType {
  if (!val) return 'land';
  const str = val.trim();
  if (str.includes('土地') && str.includes('建物')) return 'land_and_building';
  if (str.includes('建物') || str.includes('戸建') || str.includes('マンション') || str.includes('ビル')) return 'building';
  return 'land';
}

/**
 * CSVテキストから物件行のパース＆バリデーション
 */
export function parsePropertiesCsv(
  csvText: string,
  existingProperties: Property[]
): {
  rows: ParsedCsvPropertyRow[];
  totalCount: number;
  validCount: number;
  errorCount: number;
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return { rows: [], totalCount: 0, validCount: 0, errorCount: 0 };
  }

  // 1行目をヘッダーとする
  const headers = rawRows[0].map(h => normalizeHeaderName(h));
  const dataRows = rawRows.slice(1);

  // ヘッダーインデックスの特定
  const findHeaderIndex = (keywords: string[]): number => {
    return headers.findIndex(h =>
      keywords.some(k => h.includes(normalizeHeaderName(k)))
    );
  };

  const codeIdx = findHeaderIndex(['管理コード', '物件コード', '管理番号', 'コード']);
  const locIdx = findHeaderIndex(['物件所在地', '所在地', '住所', '物件名', '地番']);
  const typeIdx = findHeaderIndex(['種類', '物件種別', '種別', '区分']);
  const categoryIdx = findHeaderIndex(['地目']);
  const landAreaIdx = findHeaderIndex(['土地面積', '面積㎡', '土地面積㎡', '地積']);
  const bldgAreaIdx = findHeaderIndex(['建物面積', '延床面積', '建物面積㎡']);
  const sellerNameIdx = findHeaderIndex(['仕入先売主名', '仕入先名', '売主名', '仕入先', '売主']);
  const sellerAddrIdx = findHeaderIndex(['仕入先住所', '売主住所', '仕入先所在地']);
  const contractDateIdx = findHeaderIndex(['仕入契約日', '契約日']);
  const landPriceIdx = findHeaderIndex(['土地仕入金額', '土地仕入', '土地代金', '土地価格']);
  const bldgPriceIdx = findHeaderIndex(['建物仕入金額', '建物仕入', '建物代金', '建物価格']);
  const taxLandIdx = findHeaderIndex(['固定資産税精算金土地分', '精算金土地', '固都税土地', '精算金土地分']);
  const taxBldgIdx = findHeaderIndex(['固定資産税精算金建物分', '精算金建物', '固都税建物', '精算金建物分']);
  const settlementDateIdx = findHeaderIndex(['仕入決済日', '決済日', '引渡日', '残代金決済日']);
  const depositAmountIdx = findHeaderIndex(['手付金額', '手付金', '手付']);
  const depositDateIdx = findHeaderIndex(['手付金決済日', '手付金支払日', '手付支払日']);
  const carriedCostIdx = findHeaderIndex(['期首繰越原価', '繰越原価', '前期繰越']);
  const carriedNoteIdx = findHeaderIndex(['繰越メモ', '繰越内訳']);
  const notesIdx = findHeaderIndex(['備考メモ', '備考', 'メモ', '特記事項']);

  const parsedRows: ParsedCsvPropertyRow[] = [];
  let tempPropsForCode = [...existingProperties];

  dataRows.forEach((row, i) => {
    const rawMap: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      rawMap[h] = row[hIdx] || '';
    });

    const getVal = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : '');

    const location = getVal(locIdx).trim();
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!location) {
      errors.push('物件所在地（住所）が入力されていません');
    }

    let code = getVal(codeIdx).trim();
    if (!code) {
      code = generateNextPropertyCode(tempPropsForCode);
      warnings.push(`管理コードが未指定のため、自動採番 [${code}] を適用しました`);
    }

    const propertyType = parsePropertyType(getVal(typeIdx));
    const landCategory = getVal(categoryIdx).trim() || '宅地';
    const landArea = parseNumber(getVal(landAreaIdx));
    const buildingArea = parseNumber(getVal(bldgAreaIdx));
    const sellerName = getVal(sellerNameIdx).trim();
    const sellerAddress = getVal(sellerAddrIdx).trim();
    const contractDate = normalizeDate(getVal(contractDateIdx)) || new Date().toISOString().slice(0, 10);
    const landPurchasePrice = parseNumber(getVal(landPriceIdx));
    const buildingPurchasePrice = parseNumber(getVal(bldgPriceIdx));
    const fixedAssetTaxLand = parseNumber(getVal(taxLandIdx));
    const fixedAssetTaxBuilding = parseNumber(getVal(taxBldgIdx));
    const settlementDate = normalizeDate(getVal(settlementDateIdx));
    const depositAmount = parseNumber(getVal(depositAmountIdx));
    const depositSettlementDate = normalizeDate(getVal(depositDateIdx));
    const initialInventoryCost = parseNumber(getVal(carriedCostIdx));
    const initialInventoryNote = getVal(carriedNoteIdx).trim();
    const notes = getVal(notesIdx).trim();

    const isCarriedOver = initialInventoryCost > 0;

    const parsedRow: ParsedCsvPropertyRow = {
      rowIndex: i + 2, // 1-indexed, skipping header
      code,
      location,
      propertyType,
      landCategory,
      landArea,
      buildingArea,
      sellerName,
      sellerAddress,
      contractDate,
      landPurchasePrice,
      buildingPurchasePrice,
      fixedAssetTaxLand,
      fixedAssetTaxBuilding,
      settlementDate,
      depositAmount,
      depositSettlementDate,
      isCarriedOver,
      initialInventoryCost,
      initialInventoryNote,
      notes,
      isValid: errors.length === 0,
      warnings,
      errors,
      raw: rawMap,
    };

    parsedRows.push(parsedRow);

    // Add to temp list so next row's auto-generated code increments correctly
    tempPropsForCode.push({
      id: 'temp-' + i,
      code,
      location,
      sellerName,
      sellerAddress,
      propertyType,
      landCategory,
      landArea,
      contractDate,
      landPurchasePrice,
      buildingPurchasePrice,
      incidentalCosts: [],
      sales: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  return { rows: parsedRows, totalCount, validCount, errorCount };
}

/**
 * パース済みCSV行をProperty配列に変換
 */
export function convertCsvRowsToProperties(
  validRows: ParsedCsvPropertyRow[],
  fiscalYearId: string
): Property[] {
  const now = new Date().toISOString();
  return validRows.map((row, index) => {
    return {
      id: `prop-csv-${Date.now()}-${index}`,
      code: row.code,
      location: row.location,
      sellerName: row.sellerName,
      sellerAddress: row.sellerAddress,
      propertyType: row.propertyType,
      landCategory: row.landCategory,
      landArea: row.landArea,
      buildingArea: row.buildingArea || undefined,
      contractDate: row.contractDate,
      landPurchasePrice: row.landPurchasePrice,
      buildingPurchasePrice: row.buildingPurchasePrice, // 税込金額
      fixedAssetTaxSettlementLand: row.fixedAssetTaxLand,
      fixedAssetTaxSettlementBuilding: row.fixedAssetTaxBuilding, // 税込金額
      fixedAssetTaxSettlement: row.fixedAssetTaxLand + row.fixedAssetTaxBuilding,
      settlementDate: row.settlementDate || undefined,
      depositAmount: row.depositAmount || undefined,
      depositSettlementDate: row.depositSettlementDate || undefined,
      isCarriedOver: row.isCarriedOver,
      initialInventoryCost: row.initialInventoryCost || undefined,
      initialInventoryNote: row.initialInventoryNote || undefined,
      fiscalYearId,
      incidentalCosts: [],
      sales: [],
      notes: row.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * 費用区分のパース (表記ゆれ対応)
 */
export function parseCostType(val: string | undefined): { costType: IncidentalCostType; customName?: string } {
  if (!val) return { costType: 'その他' };
  const str = val.trim();

  // 完全一致チェック
  const exactTypes: IncidentalCostType[] = [
    '造成費用',
    '登記費用',
    '仲介手数料',
    '解体費用',
    '測量費用',
    '印紙税',
    '水道加入金・分担金',
    '設計・地盤調査費用',
    '修繕・リフォーム費用',
    'その他',
  ];
  if (exactTypes.includes(str as IncidentalCostType)) {
    return { costType: str as IncidentalCostType };
  }

  // 表記ゆれ判定
  if (str.includes('仲介') || str.includes('手数料')) return { costType: '仲介手数料' };
  if (str.includes('登記') || str.includes('登録免許税') || str.includes('司法書士')) return { costType: '登記費用' };
  if (str.includes('解体') || str.includes('滅失')) return { costType: '解体費用' };
  if (str.includes('測量') || str.includes('境界') || str.includes('分筆')) return { costType: '測量費用' };
  if (str.includes('造成') || str.includes('土工') || str.includes('擁壁') || str.includes('整地')) return { costType: '造成費用' };
  if (str.includes('印紙')) return { costType: '印紙税' };
  if (str.includes('水道') || str.includes('加入金') || str.includes('分担金') || str.includes('下水')) return { costType: '水道加入金・分担金' };
  if (str.includes('地盤') || str.includes('設計') || str.includes('地質') || str.includes('調査')) return { costType: '設計・地盤調査費用' };
  if (str.includes('リフォーム') || str.includes('修繕') || str.includes('工事') || str.includes('リノベ') || str.includes('美装') || str.includes('塗装')) return { costType: '修繕・リフォーム費用' };

  // 手入力された独自の費用種類名がある場合はそのまま保持
  return { costType: str, customName: str };
}

export interface ParsedCsvIncidentalCostRow {
  rowIndex: number;
  code: string;
  matchedProperty: Property | null;
  locationHint: string;
  costType: IncidentalCostType;
  customCostTypeName?: string;
  payee: string;
  paymentDate: string;
  amount: number;
  memo: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  raw: Record<string, string>;
}

/**
 * CSVテキストから付随費用行のパース＆バリデーション
 */
export function parseIncidentalCostsCsv(
  csvText: string,
  existingProperties: Property[]
): {
  rows: ParsedCsvIncidentalCostRow[];
  totalCount: number;
  validCount: number;
  errorCount: number;
  totalAmount: number;
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return { rows: [], totalCount: 0, validCount: 0, errorCount: 0, totalAmount: 0 };
  }

  const headers = rawRows[0].map(h => normalizeHeaderName(h));
  const dataRows = rawRows.slice(1);

  const findHeaderIndex = (keywords: string[]): number => {
    return headers.findIndex(h =>
      keywords.some(k => h.includes(normalizeHeaderName(k)))
    );
  };

  const codeIdx = findHeaderIndex(['管理コード', '物件コード', '管理番号', 'コード']);
  const locIdx = findHeaderIndex(['物件所在地', '所在地', '住所', '物件名', '地番']);
  const typeIdx = findHeaderIndex(['費用区分', '費用科目', '科目', '費用種別', '費用名', '項目', '種別']);
  const payeeIdx = findHeaderIndex(['相手先支払先', '相手先', '支払先', '支払先名', '業者名', '取引先', '支払先住所']);
  const dateIdx = findHeaderIndex(['支払日', '決済日', '発生日', '日付', '契約日']);
  const amountIdx = findHeaderIndex(['金額税込', '金額', '支払金額', '費用金額', '税込金額']);
  const memoIdx = findHeaderIndex(['備考メモ', '備考', 'メモ', '摘要', '内容', '特記事項']);

  const parsedRows: ParsedCsvIncidentalCostRow[] = [];
  let totalAmount = 0;

  dataRows.forEach((row, i) => {
    const rawMap: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      rawMap[h] = row[hIdx] || '';
    });

    const getVal = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : '');

    const code = getVal(codeIdx).trim();
    const locationHint = getVal(locIdx).trim();
    const rawCostType = getVal(typeIdx);
    const payee = getVal(payeeIdx).trim();
    const paymentDate = normalizeDate(getVal(dateIdx));
    const amount = parseNumber(getVal(amountIdx));
    const memo = getVal(memoIdx).trim();

    const { costType, customName } = parseCostType(rawCostType);

    const warnings: string[] = [];
    const errors: string[] = [];

    // 物件のマッチング (管理コード優先、フォールバックで所在地照合)
    let matchedProperty: Property | null = null;
    if (code) {
      matchedProperty = existingProperties.find(p => p.code.toLowerCase() === code.toLowerCase()) || null;
    }
    if (!matchedProperty && locationHint) {
      matchedProperty = existingProperties.find(p => p.location.includes(locationHint) || locationHint.includes(p.location)) || null;
      if (matchedProperty) {
        warnings.push(`管理コード未指定のため、所在地から物件 [${matchedProperty.code}] を自動紐付けしました`);
      }
    }

    if (!matchedProperty) {
      if (code) {
        errors.push(`管理コード「${code}」に一致する物件がシステム内に見つかりません`);
      } else {
        errors.push('管理コード（または物件所在地）が未指定のため、対象物件を特定できません');
      }
    }

    if (amount <= 0) {
      errors.push('金額が入力されていないか、0円以下です');
    }

    if (!paymentDate) {
      errors.push('支払日が未入力または不正な日付形式です');
    }

    if (!payee) {
      warnings.push('相手先（支払先）が未入力です');
    }

    const isValid = errors.length === 0 && !!matchedProperty;
    if (isValid) {
      totalAmount += amount;
    }

    parsedRows.push({
      rowIndex: i + 2,
      code: code || matchedProperty?.code || '',
      matchedProperty,
      locationHint,
      costType,
      customCostTypeName: customName,
      payee,
      paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
      amount,
      memo,
      isValid,
      warnings,
      errors,
      raw: rawMap,
    });
  });

  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  return { rows: parsedRows, totalCount, validCount, errorCount, totalAmount };
}

/**
 * パース済み付随費用データを既存物件データに適用する
 */
export function applyIncidentalCostsToProperties(
  existingProperties: Property[],
  validCostRows: ParsedCsvIncidentalCostRow[],
  mode: 'append' | 'replace'
): {
  updatedProperties: Property[];
  appliedCount: number;
  affectedPropertiesCount: number;
} {
  // プロパティIDごとの付随費用リストを構築
  const costsByPropId: Record<string, IncidentalCost[]> = {};

  validCostRows.forEach((row, idx) => {
    if (!row.matchedProperty) return;
    const propId = row.matchedProperty.id;
    if (!costsByPropId[propId]) {
      costsByPropId[propId] = [];
    }

    const costItem: IncidentalCost = {
      id: `cost-csv-${Date.now()}-${idx}`,
      propertyId: propId,
      costType: row.costType,
      customCostTypeName: row.customCostTypeName,
      payee: row.payee || '未設定',
      paymentDate: row.paymentDate,
      amount: row.amount,
      memo: row.memo || undefined,
    };

    costsByPropId[propId].push(costItem);
  });

  const affectedPropIds = new Set(Object.keys(costsByPropId));

  const updatedProperties = existingProperties.map(prop => {
    if (!costsByPropId[prop.id]) {
      return prop;
    }

    const newCosts = costsByPropId[prop.id];
    const combinedCosts = mode === 'replace'
      ? newCosts
      : [...(prop.incidentalCosts || []), ...newCosts];

    return {
      ...prop,
      incidentalCosts: combinedCosts,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    updatedProperties,
    appliedCount: validCostRows.length,
    affectedPropertiesCount: affectedPropIds.size,
  };
}

/**
 * CSVテキストの自動種別判定 (物件 or 付随費用)
 */
export function detectCsvType(csvText: string): 'properties' | 'incidental_costs' {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) return 'properties';

  const firstRowStr = rawRows[0].join(',').toLowerCase();
  if (
    firstRowStr.includes('費用区分') ||
    firstRowStr.includes('費用科目') ||
    firstRowStr.includes('科目') ||
    firstRowStr.includes('相手先') ||
    firstRowStr.includes('支払先') ||
    (firstRowStr.includes('支払日') && !firstRowStr.includes('土地仕入'))
  ) {
    return 'incidental_costs';
  }

  return 'properties';
}
