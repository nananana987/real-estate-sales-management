import { Property, FiscalYear, CompanyInfo } from '../types';
import { initialFiscalYears, initialProperties, initialCompanyInfo } from './sampleData';
import { calculatePropertyFinancials } from './calculations';

const PROPERTIES_KEY = 're_sales_mgmt_properties_v2';
const FISCAL_YEARS_KEY = 're_sales_mgmt_fiscal_years_v2';
const SELECTED_FY_KEY = 're_sales_mgmt_selected_fy_v2';
const COMPANY_INFO_KEY = 're_sales_mgmt_company_v2';
const CLEANED_FLAG_KEY = 're_sales_mgmt_sample_cleaned_v2';

// 過去のv1キーに残っていたサンプルデータを初回起動時に確実にクリーンアップ
function ensureSampleCleaned() {
  try {
    if (!localStorage.getItem(CLEANED_FLAG_KEY)) {
      localStorage.removeItem('re_sales_mgmt_properties_v1');
      localStorage.removeItem('re_sales_mgmt_fiscal_years_v1');
      localStorage.removeItem('re_sales_mgmt_selected_fy_v1');
      localStorage.removeItem(PROPERTIES_KEY);
      localStorage.removeItem(FISCAL_YEARS_KEY);
      localStorage.removeItem(SELECTED_FY_KEY);
      localStorage.removeItem(COMPANY_INFO_KEY);
      localStorage.setItem(CLEANED_FLAG_KEY, 'true');
    }
  } catch (e) {
    console.error('Clean check failed', e);
  }
}

export function loadCompanyInfo(): CompanyInfo {
  ensureSampleCleaned();
  try {
    const raw = localStorage.getItem(COMPANY_INFO_KEY);
    if (!raw) {
      saveCompanyInfo(initialCompanyInfo);
      return initialCompanyInfo;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load company info from localStorage', err);
    return initialCompanyInfo;
  }
}

export function saveCompanyInfo(company: CompanyInfo): void {
  try {
    localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(company));
  } catch (err) {
    console.error('Failed to save company info to localStorage', err);
  }
}

export function loadProperties(): Property[] {
  ensureSampleCleaned();
  try {
    const raw = localStorage.getItem(PROPERTIES_KEY);
    if (!raw) {
      saveProperties(initialProperties);
      return initialProperties;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load properties from localStorage', err);
    return initialProperties;
  }
}

export function saveProperties(properties: Property[]): void {
  try {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
  } catch (err) {
    console.error('Failed to save properties to localStorage', err);
  }
}

export function loadFiscalYears(): FiscalYear[] {
  ensureSampleCleaned();
  try {
    const raw = localStorage.getItem(FISCAL_YEARS_KEY);
    if (!raw) {
      saveFiscalYears(initialFiscalYears);
      return initialFiscalYears;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load fiscal years from localStorage', err);
    return initialFiscalYears;
  }
}

export function saveFiscalYears(fiscalYears: FiscalYear[]): void {
  try {
    localStorage.setItem(FISCAL_YEARS_KEY, JSON.stringify(fiscalYears));
  } catch (err) {
    console.error('Failed to save fiscal years to localStorage', err);
  }
}

export function loadSelectedFiscalYearId(): string {
  ensureSampleCleaned();
  try {
    const raw = localStorage.getItem(SELECTED_FY_KEY);
    if (raw) return raw;
    const years = loadFiscalYears();
    const current = years.find(y => y.isCurrent) || years[0];
    return current ? current.id : 'fy-1';
  } catch {
    return 'fy-1';
  }
}

export function saveSelectedFiscalYearId(id: string): void {
  try {
    localStorage.setItem(SELECTED_FY_KEY, id);
  } catch (err) {
    console.error('Failed to save selected FY', err);
  }
}

export function resetAllData(): {
  properties: Property[];
  fiscalYears: FiscalYear[];
  companyInfo: CompanyInfo;
} {
  saveProperties(initialProperties);
  saveFiscalYears(initialFiscalYears);
  saveCompanyInfo(initialCompanyInfo);
  saveSelectedFiscalYearId('fy-1');
  return {
    properties: initialProperties,
    fiscalYears: initialFiscalYears,
    companyInfo: initialCompanyInfo,
  };
}

export function exportBackupJSON(
  properties: Property[],
  fiscalYears: FiscalYear[],
  companyInfo?: CompanyInfo
): void {
  const exportData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    companyInfo: companyInfo || initialCompanyInfo,
    fiscalYears,
    properties,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const companyPrefix = companyInfo?.name ? `${companyInfo.name}_` : '';
  a.download = `${companyPrefix}不動産販売原価管理_バックアップ_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(
  file: File,
  onSuccess: (data: {
    properties: Property[];
    fiscalYears: FiscalYear[];
    companyInfo?: CompanyInfo;
  }) => void,
  onError: (msg: string) => void
): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.properties) || !Array.isArray(parsed.fiscalYears)) {
        throw new Error('無効なデータ形式です。propertiesまたはfiscalYearsが見つかりません。');
      }
      saveProperties(parsed.properties);
      saveFiscalYears(parsed.fiscalYears);
      if (parsed.companyInfo) {
        saveCompanyInfo(parsed.companyInfo);
      }
      const current = parsed.fiscalYears.find((y: FiscalYear) => y.isCurrent) || parsed.fiscalYears[0];
      if (current) saveSelectedFiscalYearId(current.id);
      onSuccess({
        properties: parsed.properties,
        fiscalYears: parsed.fiscalYears,
        companyInfo: parsed.companyInfo,
      });
    } catch (err: any) {
      onError('ファイルの読み込みに失敗しました: ' + (err.message || 'データ構造が無効です'));
    }
  };
  reader.readAsText(file);
}

/**
 * CSVエクスポートヘルパー (BOM付きUTF-8)
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 年度更新処理:
 * - 完売した物件（売却済かつ棚卸残高0）は新年度の通常一覧から除外（過去年度データとしては保持）
 * - 棚卸残高がある物件（保有中・一部売却済・未決済）を新年度へ繰越。
 * - 期末棚卸残高を新年度の期首棚卸高(initialInventoryCost)として設定。
 */
export function rolloverToNewFiscalYear(
  currentFY: FiscalYear,
  newPeriodNumber: number,
  newStartDate: string,
  newEndDate: string,
  allProperties: Property[],
  allFiscalYears: FiscalYear[]
): { updatedFiscalYears: FiscalYear[]; updatedProperties: Property[]; newFYId: string } {
  const newFYId = `fy-${newStartDate.slice(0, 4)}`;
  const newFYName = `第${newPeriodNumber}期 (${newStartDate.replace(/-/g, '/')} 〜 ${newEndDate.replace(/-/g, '/')})`;

  const updatedFiscalYears: FiscalYear[] = allFiscalYears.map(fy => ({
    ...fy,
    isCurrent: false,
    isClosed: fy.id === currentFY.id ? true : fy.isClosed,
  }));

  const newFiscalYear: FiscalYear = {
    id: newFYId,
    name: newFYName,
    periodNumber: newPeriodNumber,
    startDate: newStartDate,
    endDate: newEndDate,
    isCurrent: true,
    isClosed: false,
  };

  updatedFiscalYears.push(newFiscalYear);

  // 物件の繰越処理
  const updatedProperties = allProperties.map(prop => {
    const fin = calculatePropertyFinancials(prop, currentFY);

    // 完売した物件は過去年度(currentFY.id)のまま据え置き（新年度には繰り越さない）
    if (fin.status === 'sold_out' || fin.endingInventory === 0) {
      return prop;
    }

    // 保有中・一部売却など残高がある物件は新年度へ繰越
    return {
      ...prop,
      fiscalYearId: newFYId,
      isCarriedOver: true,
      // 現在の期末棚卸金額を新年度の期首棚卸残高としてセット
      initialInventoryCost: fin.endingInventory,
      initialInventoryNote: `第${currentFY.periodNumber}期末棚卸残高より繰越 (${fin.endingInventory.toLocaleString('ja-JP')}円)`,
      updatedAt: new Date().toISOString(),
    };
  });

  saveFiscalYears(updatedFiscalYears);
  saveProperties(updatedProperties);
  saveSelectedFiscalYearId(newFYId);

  return {
    updatedFiscalYears,
    updatedProperties,
    newFYId,
  };
}
