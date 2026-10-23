import { Property, PropertyType, LandCategory, IncidentalCost, IncidentalCostType, SaleRecord, SaleCategory } from '../types';
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

/**
 * 売上情報CSVテンプレートの定義
 */
export const SALE_CSV_TEMPLATE_HEADERS = [
  '管理コード',
  '物件所在地',
  '売却形態',
  '区画・号地名',
  '買主名_売上先',
  '買主住所',
  '売上契約日',
  '売上決済日',
  '手付金額',
  '手付金受領日',
  '売却土地面積_㎡',
  '売却建物面積_㎡',
  '土地売上金額_非課税',
  '建物売上金額_税込',
  '固定資産税精算金_土地分',
  '固定資産税精算金_建物分_税込',
  '計上売上原価',
  '原価計算メモ',
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
  const clean = val
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[－ー▲△]/g, '-')
    .replace(/[¥,，円\s]/g, '');
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
    const rawDateStr = getVal(dateIdx).trim();
    const paymentDate = normalizeDate(rawDateStr);
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

    if (!amount || amount === 0) {
      errors.push('金額が入力されていないか、0円です');
    }

    if (rawDateStr && !paymentDate) {
      errors.push('支払日が不正な日付形式です');
    } else if (!rawDateStr) {
      warnings.push('支払日が未入力のため「未払」として登録されます');
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
      paymentDate: paymentDate || '',
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

// ============================================================================
// 3. 売上情報 CSV一括取込ロジック
// ============================================================================

/**
 * 売上情報CSVのサンプルテンプレートを生成する
 */
export function generateSaleCsvTemplate(existingProperties?: Property[]): string {
  const firstProp = existingProperties && existingProperties.length > 0 ? existingProperties[0] : null;
  const secondProp = existingProperties && existingProperties.length > 1 ? existingProperties[1] : null;

  const sampleCode1 = firstProp ? firstProp.code : '25001';
  const sampleLoc1 = firstProp ? firstProp.location : '東京都世田谷区成城6-12-8';
  const sampleCode2 = secondProp ? secondProp.code : sampleCode1;
  const sampleLoc2 = secondProp ? secondProp.location : sampleLoc1;

  const sampleRows = [
    [
      sampleCode1,
      sampleLoc1,
      '全部売却',
      '',
      '鈴木 一郎',
      '東京都世田谷区砧2-3-4',
      '2025-10-15',
      '2025-11-28',
      '3000000',
      '2025-10-15',
      '120.50',
      '95.20',
      '35000000',
      '18000000',
      '42000',
      '28000',
      '', // 計上売上原価 (空欄の場合は物件の総仕入原価または面積按分から自動計算)
      '',
      '一般個人向け一括売却・引渡完了',
    ],
    [
      sampleCode2,
      sampleLoc2,
      '一部売却',
      'A区画 (北側)',
      '株式会社都市住宅販売',
      '東京都新宿区西新宿1-10-2',
      '2025-11-10',
      '2025-12-20',
      '2000000',
      '2025-11-10',
      '100.00',
      '0',
      '24800000',
      '0',
      '31000',
      '0',
      '18500000', // 明示的に売上原価を指定する例
      '面積按分により算出',
      '2区画分譲のうちA区画引渡',
    ],
  ];

  const lines = [
    SALE_CSV_TEMPLATE_HEADERS.join(','),
    ...sampleRows.map(row =>
      row
        .map(cell => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ];

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * 売上情報CSVテンプレートをダウンロードする
 */
export function downloadSaleCsvTemplate(existingProperties?: Property[]): void {
  const csvContent = generateSaleCsvTemplate(existingProperties);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `売上データ取込用テンプレート_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 売上CSVパース結果の1行データ
 */
export interface ParsedCsvSaleRow {
  rowIndex: number;
  targetCode: string;
  targetLocation: string;
  matchedProperty?: Property;
  saleCategory: SaleCategory;
  partialSaleName: string;
  buyerName: string;
  buyerAddress: string;
  contractDate: string;
  settlementDate: string;
  depositAmount: number;
  depositSettlementDate: string;
  soldLandArea: number;
  soldBuildingArea: number;
  landPrice: number;
  buildingPrice: number;
  fixedAssetTaxSettlementLand: number;
  fixedAssetTaxSettlementBuilding: number;
  fixedAssetTaxSettlement: number;
  costOfGoodsSold: number | null; // nullの場合は物件原価から自動計算
  costCalculationNote: string;
  memo: string;
  errors: string[];
  warnings: string[];
}

/**
 * 売却形態文字列の正規化
 */
function normalizeSaleCategory(raw: string, partialName: string): SaleCategory {
  const s = (raw || '').trim().toLowerCase();
  if (
    s.includes('一部') ||
    s.includes('分筆') ||
    s.includes('分譲') ||
    s.includes('区画') ||
    s === 'partial'
  ) {
    return 'partial';
  }
  if (s.includes('全') || s.includes('一括') || s === 'full') {
    return 'full';
  }
  // 明示指定がない場合、区画名が入っていれば一部売却と推定
  if (partialName && partialName.trim().length > 0) {
    return 'partial';
  }
  return 'full';
}

/**
 * 物件の総仕入原価（初期繰越 + 土地・建物仕入 + 固都税精算金 + 付随費用累計）を算出
 */
function computePropertyTotalAcquisitionCost(prop: Property): number {
  const initialCost = prop.isCarriedOver ? Number(prop.initialInventoryCost) || 0 : 0;
  const landCost = Number(prop.landPurchasePrice) || 0;
  const bldgCost = Number(prop.buildingPurchasePrice) || 0;
  const taxLand = Number(prop.fixedAssetTaxSettlementLand) || 0;
  const taxBldg = Number(prop.fixedAssetTaxSettlementBuilding) || 0;
  const taxTotal =
    taxLand + taxBldg > 0 ? taxLand + taxBldg : Number(prop.fixedAssetTaxSettlement) || 0;
  const incidentalTotal = (prop.incidentalCosts || []).reduce(
    (acc, c) => acc + (Number(c.amount) || 0),
    0
  );
  return initialCost + landCost + bldgCost + taxTotal + incidentalTotal;
}

/**
 * 売上情報CSVテキストを解析し、既存物件との紐付け・バリデーションを行う
 */
export function parseSalesCsv(
  csvText: string,
  existingProperties: Property[]
): {
  headers: string[];
  rows: ParsedCsvSaleRow[];
  validRows: ParsedCsvSaleRow[];
  hasHeaderRow: boolean;
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return { headers: [], rows: [], validRows: [], hasHeaderRow: false };
  }

  const firstRow = rawRows[0];
  const headerKeywords = [
    '管理コード',
    'コード',
    '所在地',
    '買主',
    '売上先',
    '売却形態',
    '契約日',
    '土地売上',
    '建物売上',
  ];
  const hasHeaderRow = firstRow.some(cell =>
    headerKeywords.some(kw => cell.includes(kw))
  );

  const headers = hasHeaderRow ? firstRow : SALE_CSV_TEMPLATE_HEADERS;
  const dataRows = hasHeaderRow ? rawRows.slice(1) : rawRows;

  const findColIndex = (patterns: string[], fallbackIndex: number): number => {
    if (!hasHeaderRow) return fallbackIndex;
    const idx = headers.findIndex(h => {
      const cleanH = h.replace(/[\s_（）()]/g, '').toLowerCase();
      return patterns.some(p => cleanH.includes(p.toLowerCase()));
    });
    return idx >= 0 ? idx : fallbackIndex;
  };

  const colMap = {
    code: findColIndex(['管理コード', '管理番号', '物件コード', 'コード', 'code'], 0),
    location: findColIndex(['物件所在地', '所在地', '住所', '地番', '物件名', 'location'], 1),
    saleCategory: findColIndex(['売却形態', '売却区分', '形態', 'category'], 2),
    partialSaleName: findColIndex(['区画', '号地', '区画名', '号地名', 'partial'], 3),
    buyerName: findColIndex(['買主名', '買主', '売上先', '顧客名', 'buyer'], 4),
    buyerAddress: findColIndex(['買主住所', '売上先住所', '顧客住所'], 5),
    contractDate: findColIndex(['売上契約日', '売却契約日', '契約日', 'contract'], 6),
    settlementDate: findColIndex(['売上決済日', '売却決済日', '決済日', '引渡日', 'settlement'], 7),
    depositAmount: findColIndex(['手付金額', '手付金', 'deposit'], 8),
    depositSettlementDate: findColIndex(['手付金受領日', '手付金決済日', '手付受領日', '手付日'], 9),
    soldLandArea: findColIndex(['売却土地面積', '土地面積', '売上土地面積'], 10),
    soldBuildingArea: findColIndex(['売却建物面積', '建物面積', '売上建物面積'], 11),
    landPrice: findColIndex(['土地売上金額', '土地売却金額', '土地売上', '土地価格', 'landprice'], 12),
    buildingPrice: findColIndex(['建物売上金額', '建物売却金額', '建物売上', '建物価格', 'buildingprice'], 13),
    fixedTaxLand: findColIndex(['固定資産税精算金土地', '固都税精算金土地', '精算金土地', '固都税土地'], 14),
    fixedTaxBldg: findColIndex(['固定資産税精算金建物', '固都税精算金建物', '精算金建物', '固都税建物'], 15),
    costOfGoodsSold: findColIndex(['計上売上原価', '売上原価', '按分原価', '原価', 'cogs'], 16),
    costCalculationNote: findColIndex(['原価計算メモ', '計算根拠', '按分メモ', '原価メモ'], 17),
    memo: findColIndex(['備考メモ', '備考', 'メモ', '摘要', 'memo'], 18),
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const parsedRows: ParsedCsvSaleRow[] = [];

  dataRows.forEach((cells, idx) => {
    const getCell = (colIdx: number): string =>
      colIdx >= 0 && colIdx < cells.length ? cells[colIdx].trim() : '';

    const errors: string[] = [];
    const warnings: string[] = [];

    const rawCode = getCell(colMap.code);
    const rawLocation = getCell(colMap.location);
    const rawCategory = getCell(colMap.saleCategory);
    const partialSaleName = getCell(colMap.partialSaleName);
    const buyerName = getCell(colMap.buyerName);
    const buyerAddress = getCell(colMap.buyerAddress);
    const rawContractDate = getCell(colMap.contractDate);
    const rawSettlementDate = getCell(colMap.settlementDate);
    const rawDepositAmount = getCell(colMap.depositAmount);
    const rawDepositDate = getCell(colMap.depositSettlementDate);
    const rawSoldLandArea = getCell(colMap.soldLandArea);
    const rawSoldBldgArea = getCell(colMap.soldBuildingArea);
    const rawLandPrice = getCell(colMap.landPrice);
    const rawBldgPrice = getCell(colMap.buildingPrice);
    const rawTaxLand = getCell(colMap.fixedTaxLand);
    const rawTaxBldg = getCell(colMap.fixedTaxBldg);
    const rawCOGS = getCell(colMap.costOfGoodsSold);
    const costCalculationNote = getCell(colMap.costCalculationNote);
    const memo = getCell(colMap.memo);

    // 既存物件とのマッチング (1: 管理コード一致, 2: 所在地一致または部分一致)
    let matchedProperty: Property | undefined;
    if (rawCode) {
      matchedProperty = existingProperties.find(
        p => p.code.trim().toLowerCase() === rawCode.toLowerCase()
      );
    }
    if (!matchedProperty && rawLocation) {
      matchedProperty = existingProperties.find(
        p => p.location.trim() === rawLocation.trim()
      );
      if (!matchedProperty) {
        matchedProperty = existingProperties.find(
          p =>
            p.location.includes(rawLocation.trim()) ||
            rawLocation.trim().includes(p.location)
        );
      }
    }

    if (!matchedProperty) {
      if (!rawCode && !rawLocation) {
        errors.push('紐付け先の「管理コード」または「物件所在地」が入力されていません');
      } else {
        errors.push(
          `該当する物件が見つかりません (${rawCode ? `コード:${rawCode}` : ''}${
            rawCode && rawLocation ? ' / ' : ''
          }${rawLocation ? `所在地:${rawLocation}` : ''})`
        );
      }
    }

    const saleCategory = normalizeSaleCategory(rawCategory, partialSaleName);

    let contractDate = normalizeDate(rawContractDate);
    if (!contractDate) {
      contractDate = todayStr;
      warnings.push(`契約日が未入力または形式不正のため本日(${todayStr})を設定しました`);
    }

    const settlementDate = normalizeDate(rawSettlementDate);
    if (rawSettlementDate && !settlementDate) {
      warnings.push(`決済日「${rawSettlementDate}」の形式が不正なため未決済として扱います`);
    }

    const depositSettlementDate = normalizeDate(rawDepositDate);

    const landPrice = Math.round(parseNumber(rawLandPrice));
    const buildingPrice = Math.round(parseNumber(rawBldgPrice));
    const fixedAssetTaxSettlementLand = Math.round(parseNumber(rawTaxLand));
    const fixedAssetTaxSettlementBuilding = Math.round(parseNumber(rawTaxBldg));
    const fixedAssetTaxSettlement =
      fixedAssetTaxSettlementLand + fixedAssetTaxSettlementBuilding;

    if (landPrice === 0 && buildingPrice === 0) {
      warnings.push('売上金額0円（無償譲渡・帰属等）として登録します');
    }

    if (!buyerName) {
      warnings.push('買主名（売上先）が未入力です');
    }

    const soldLandArea = parseNumber(rawSoldLandArea);
    const soldBuildingArea = parseNumber(rawSoldBldgArea);
    const depositAmount = Math.round(parseNumber(rawDepositAmount));

    // 計上売上原価: 空欄の場合は null としておき、適用時に自動計算またはプレビュー用に算出
    const hasExplicitCOGS = rawCOGS !== '';
    let costOfGoodsSold: number | null = hasExplicitCOGS
      ? Math.round(parseNumber(rawCOGS))
      : null;

    let resolvedNote = costCalculationNote;

    if (costOfGoodsSold === null && matchedProperty) {
      const totalAcq = computePropertyTotalAcquisitionCost(matchedProperty);
      const existingCOGS = (matchedProperty.sales || []).reduce(
        (acc, s) => acc + (Number(s.costOfGoodsSold) || 0),
        0
      );
      const remainingAcq = Math.max(0, totalAcq - existingCOGS);

      if (saleCategory === 'full') {
        costOfGoodsSold = remainingAcq;
        if (!resolvedNote) {
          resolvedNote = `【全部売却(CSV取込)】未計上の仕入原価残額 ¥${remainingAcq.toLocaleString()} を自動計上`;
        }
      } else if (
        saleCategory === 'partial' &&
        soldLandArea > 0 &&
        (matchedProperty.landArea || 0) > 0
      ) {
        const ratio = soldLandArea / matchedProperty.landArea;
        costOfGoodsSold = Math.round(totalAcq * ratio);
        if (!resolvedNote) {
          resolvedNote = `【面積按分(CSV取込)】総仕入原価 ¥${totalAcq.toLocaleString()} × (${soldLandArea}㎡ / ${matchedProperty.landArea}㎡) で自動算出`;
        }
      } else {
        costOfGoodsSold = 0;
        warnings.push('一部売却で売上原価・売却面積が未指定のため売上原価を0円としました');
      }
    }

    parsedRows.push({
      rowIndex: hasHeaderRow ? idx + 2 : idx + 1,
      targetCode: rawCode || (matchedProperty?.code ?? ''),
      targetLocation: rawLocation || (matchedProperty?.location ?? ''),
      matchedProperty,
      saleCategory,
      partialSaleName,
      buyerName: buyerName || '未設定',
      buyerAddress,
      contractDate,
      settlementDate,
      depositAmount,
      depositSettlementDate,
      soldLandArea,
      soldBuildingArea,
      landPrice,
      buildingPrice,
      fixedAssetTaxSettlementLand,
      fixedAssetTaxSettlementBuilding,
      fixedAssetTaxSettlement,
      costOfGoodsSold,
      costCalculationNote: resolvedNote,
      memo,
      errors,
      warnings,
    });
  });

  const validRows = parsedRows.filter(
    r => r.errors.length === 0 && !!r.matchedProperty
  );

  return {
    headers,
    rows: parsedRows,
    validRows,
    hasHeaderRow,
  };
}

/**
 * パース済み売上データを既存物件データに適用する
 */
export function applySalesToProperties(
  existingProperties: Property[],
  validSaleRows: ParsedCsvSaleRow[],
  mode: 'append' | 'replace'
): {
  updatedProperties: Property[];
  appliedCount: number;
  affectedPropertiesCount: number;
} {
  const salesByPropId: Record<string, ParsedCsvSaleRow[]> = {};

  validSaleRows.forEach(row => {
    if (!row.matchedProperty) return;
    const propId = row.matchedProperty.id;
    if (!salesByPropId[propId]) {
      salesByPropId[propId] = [];
    }
    salesByPropId[propId].push(row);
  });

  const affectedPropIds = new Set(Object.keys(salesByPropId));

  const updatedProperties = existingProperties.map(prop => {
    const propSaleRows = salesByPropId[prop.id];
    if (!propSaleRows || propSaleRows.length === 0) {
      return prop;
    }

    const baseSales: SaleRecord[] = mode === 'replace' ? [] : [...(prop.sales || [])];
    const totalAcq = computePropertyTotalAcquisitionCost(prop);

    propSaleRows.forEach((row, idx) => {
      const currentCOGSTotal = baseSales.reduce(
        (acc, s) => acc + (Number(s.costOfGoodsSold) || 0),
        0
      );
      const remainingAcq = Math.max(0, totalAcq - currentCOGSTotal);

      const currentSoldLandTotal = baseSales.reduce(
        (acc, s) => acc + (Number(s.soldLandArea) || 0),
        0
      );
      const remainingLandArea = Math.max(0, (Number(prop.landArea) || 0) - currentSoldLandTotal);

      let finalCOGS = row.costOfGoodsSold ?? 0;
      if (row.saleCategory === 'full' && (row.costOfGoodsSold === null || mode === 'replace')) {
        // 全部売却で自動算出だった場合は残余原価を正確に充当
        finalCOGS = row.costOfGoodsSold !== null ? row.costOfGoodsSold : remainingAcq;
      }

      const finalSoldLandArea =
        row.soldLandArea > 0
          ? row.soldLandArea
          : row.saleCategory === 'full' && remainingLandArea > 0
          ? Math.round(remainingLandArea * 100) / 100
          : 0;

      const finalSoldBldgArea =
        row.soldBuildingArea > 0
          ? row.soldBuildingArea
          : row.saleCategory === 'full' && (prop.buildingArea || 0) > 0
          ? prop.buildingArea || 0
          : 0;

      const saleType: PropertyType =
        row.landPrice > 0 && row.buildingPrice > 0
          ? 'land_and_building'
          : row.buildingPrice > 0
          ? 'building'
          : prop.propertyType || 'land';

      const saleRecord: SaleRecord = {
        id: `sale-csv-${Date.now()}-${idx}`,
        propertyId: prop.id,
        buyerName: row.buyerName || '未設定',
        buyerAddress: row.buyerAddress || '',
        saleType,
        saleCategory: row.saleCategory,
        partialSaleName: row.partialSaleName || undefined,
        soldLandArea: finalSoldLandArea,
        soldBuildingArea: finalSoldBldgArea,
        contractDate: row.contractDate,
        landPrice: row.landPrice,
        buildingPrice: row.buildingPrice,
        buildingTax: 0,
        settlementDate: row.settlementDate || undefined,
        depositAmount: row.depositAmount || 0,
        depositSettlementDate: row.depositSettlementDate || undefined,
        fixedAssetTaxSettlementLand: row.fixedAssetTaxSettlementLand,
        fixedAssetTaxSettlementBuilding: row.fixedAssetTaxSettlementBuilding,
        fixedAssetTaxSettlementBuildingTax: 0,
        fixedAssetTaxSettlement: row.fixedAssetTaxSettlement,
        costOfGoodsSold: finalCOGS,
        costCalculationNote: row.costCalculationNote || undefined,
        memo: row.memo || undefined,
      };

      baseSales.push(saleRecord);
    });

    return {
      ...prop,
      sales: baseSales,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    updatedProperties,
    appliedCount: validSaleRows.length,
    affectedPropertiesCount: affectedPropIds.size,
  };
}

/**
 * CSVテキストの自動種別判定 (物件 or 付随費用 or 売上)
 */
export function detectCsvType(
  csvText: string
): 'properties' | 'incidental_costs' | 'sales' {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) return 'properties';

  const firstRowStr = rawRows[0].join(',').toLowerCase();
  if (
    firstRowStr.includes('買主') ||
    firstRowStr.includes('売上先') ||
    firstRowStr.includes('売却形態') ||
    firstRowStr.includes('土地売上') ||
    firstRowStr.includes('建物売上') ||
    firstRowStr.includes('売却土地') ||
    firstRowStr.includes('計上売上原価')
  ) {
    return 'sales';
  }

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

