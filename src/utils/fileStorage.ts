import { Property, FiscalYear, CompanyInfo, AppDataFile, FileSaveStatus } from '../types';
import { initialFiscalYears, initialProperties, initialCompanyInfo } from './sampleData';

const DB_NAME = 'real_estate_file_system_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'file_handles';
const KEY_ACTIVE_HANDLE = 'active_file_handle';
const KEY_ACTIVE_META = 'active_file_meta';

/**
 * File System Access APIがブラウザでサポートされているか判定
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

/**
 * IndexedDBの初期化・オープン
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 選択されたファイルハンドルとメタ情報をIndexedDBに永続化
 */
export async function storeHandleInIDB(handle: FileSystemFileHandle, fileName: string): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, KEY_ACTIVE_HANDLE);
    store.put({ fileName, savedAt: new Date().toISOString() }, KEY_ACTIVE_META);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[FileStorage] IndexedDBへのファイルハンドル保存に失敗:', err);
  }
}

/**
 * IndexedDBから保持されている前回のファイルハンドルとメタ情報を取得
 */
export async function getHandleFromIDB(): Promise<{
  handle: FileSystemFileHandle | null;
  meta: { fileName: string; savedAt: string } | null;
}> {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const handleReq = store.get(KEY_ACTIVE_HANDLE);
    const metaReq = store.get(KEY_ACTIVE_META);

    return await new Promise(resolve => {
      tx.oncomplete = () => {
        resolve({
          handle: (handleReq.result as FileSystemFileHandle) || null,
          meta: (metaReq.result as { fileName: string; savedAt: string }) || null,
        });
      };
      tx.onerror = () => {
        resolve({ handle: null, meta: null });
      };
    });
  } catch (err) {
    console.warn('[FileStorage] IndexedDBからのファイルハンドル取得に失敗:', err);
    return { handle: null, meta: null };
  }
}

/**
 * IndexedDBのファイルハンドル情報をクリア（接続解除時）
 */
export async function clearHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(KEY_ACTIVE_HANDLE);
    store.delete(KEY_ACTIVE_META);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[FileStorage] IndexedDBクリアに失敗:', err);
  }
}

/**
 * ファイルハンドルへのアクセス権限を確認（必要に応じてプロンプト表示）
 * @param handle ファイルハンドル
 * @param withPrompt ユーザー操作(クリック等)の文脈で権限リクエストダイアログを出すか
 */
export async function verifyHandlePermission(
  handle: FileSystemFileHandle,
  withPrompt: boolean = false
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {
    mode: 'readwrite',
  };

  try {
    // まず現在のパーミッション状態を非侵襲的に確認
    const status = await handle.queryPermission(options);
    if (status === 'granted') {
      return true;
    }

    // ユーザーインタラクション起因の場合のみブラウザ標準ダイアログを起動
    if (withPrompt) {
      const requestStatus = await handle.requestPermission(options);
      if (requestStatus === 'granted') {
        return true;
      }
    }
  } catch (err) {
    console.warn('[FileStorage] パーミッション検証エラー:', err);
  }
  return false;
}

/**
 * 初期データオブジェクトを作成
 */
export function buildInitialData(
  companyInfo?: CompanyInfo,
  fiscalYears?: FiscalYear[],
  properties?: Property[],
  selectedFiscalYearId?: string
): AppDataFile {
  const fyList = fiscalYears && fiscalYears.length > 0 ? fiscalYears : initialFiscalYears;
  const currentFy = fyList.find(y => y.isCurrent) || fyList[0];

  return {
    version: '2.0',
    appName: '不動産販売・原価管理システム',
    lastModified: new Date().toISOString(),
    companyInfo: companyInfo || initialCompanyInfo,
    fiscalYears: fyList,
    selectedFiscalYearId: selectedFiscalYearId || currentFy?.id || 'fy-1',
    properties: properties || initialProperties,
  };
}

/**
 * ファイルハンドルからデータを読み込み
 */
export async function readFileData(handle: FileSystemFileHandle): Promise<AppDataFile> {
  const file = await handle.getFile();
  const text = await file.text();

  if (!text || text.trim().length === 0) {
    // 新規作成された空ファイル等の場合は初期テンプレートを返す
    return buildInitialData();
  }

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSONの構文が無効です。');
  }

  const properties = Array.isArray(parsed.properties) ? parsed.properties : initialProperties;
  const fiscalYears = Array.isArray(parsed.fiscalYears) ? parsed.fiscalYears : initialFiscalYears;
  const companyInfo = parsed.companyInfo || initialCompanyInfo;
  const selectedFiscalYearId =
    parsed.selectedFiscalYearId ||
    fiscalYears.find((y: FiscalYear) => y.isCurrent)?.id ||
    fiscalYears[0]?.id ||
    'fy-1';

  return {
    version: parsed.version || '2.0',
    appName: parsed.appName || '不動産販売・原価管理システム',
    lastModified: parsed.lastModified || new Date().toISOString(),
    companyInfo,
    fiscalYears,
    selectedFiscalYearId,
    properties,
  };
}

/**
 * ファイルハンドルへデータを直接上書き書き込み（オートセーブ）
 */
export async function writeFileData(
  handle: FileSystemFileHandle,
  data: AppDataFile
): Promise<void> {
  const writable = await handle.createWritable();
  const payload: AppDataFile = {
    ...data,
    version: '2.0',
    appName: '不動産販売・原価管理システム',
    lastModified: new Date().toISOString(),
  };
  const jsonContent = JSON.stringify(payload, null, 2);
  await writable.write(jsonContent);
  await writable.close();
}

/**
 * ファイル選択ピッカーを開いて既存のファイルを選択・読込
 */
export async function pickAndOpenFile(): Promise<{
  handle: FileSystemFileHandle;
  data: AppDataFile;
  fileName: string;
}> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザはFile System Access APIに対応していません。');
  }

  const [handle] = await (window as any).showOpenFilePicker({
    types: [
      {
        description: '不動産原価管理 JSONデータ (*.json)',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
    multiple: false,
  });

  if (!handle) {
    throw new Error('ファイルが選択されませんでした。');
  }

  // 権限確認
  const permitted = await verifyHandlePermission(handle, true);
  if (!permitted) {
    throw new Error('ファイルへのアクセス権限が得られませんでした。');
  }

  const data = await readFileData(handle);
  await storeHandleInIDB(handle, handle.name);

  return {
    handle,
    data,
    fileName: handle.name,
  };
}

/**
 * 保存先ピッカーを開いて新しいPCローカルファイルを作成・保存
 */
export async function pickAndCreateFile(
  currentData: AppDataFile,
  suggestedName?: string
): Promise<{
  handle: FileSystemFileHandle;
  fileName: string;
}> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザはFile System Access APIに対応していません。');
  }

  const defaultFileName =
    suggestedName ||
    `不動産原価管理_${currentData.companyInfo?.name ? currentData.companyInfo.name + '_' : ''}${new Date().toISOString().slice(0, 10)}.json`;

  const handle = await (window as any).showSaveFilePicker({
    suggestedName: defaultFileName,
    types: [
      {
        description: '不動産原価管理 JSONデータ (*.json)',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
  });

  if (!handle) {
    throw new Error('保存先ファイルが指定されませんでした。');
  }

  const permitted = await verifyHandlePermission(handle, true);
  if (!permitted) {
    throw new Error('ファイルへのアクセス権限が得られませんでした。');
  }

  await writeFileData(handle, currentData);
  await storeHandleInIDB(handle, handle.name);

  return {
    handle,
    fileName: handle.name,
  };
}

/**
 * フォールバック処理: 手動JSONダウンロード（エクスポート）
 */
export function exportManualDownload(data: AppDataFile, customName?: string): void {
  const defaultFileName =
    customName ||
    `不動産原価管理_${data.companyInfo?.name ? data.companyInfo.name + '_' : ''}${new Date().toISOString().slice(0, 10)}.json`;

  const payload: AppDataFile = {
    ...data,
    version: '2.0',
    appName: '不動産販売・原価管理システム',
    lastModified: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * フォールバック処理: 手動ファイル選択によるJSONインポート
 */
export function importManualFile(file: File): Promise<AppDataFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.properties) || !Array.isArray(parsed.fiscalYears)) {
          throw new Error('無効なデータ形式です。propertiesまたはfiscalYearsが見つかりません。');
        }
        resolve({
          version: parsed.version || '2.0',
          appName: parsed.appName || '不動産販売・原価管理システム',
          lastModified: new Date().toISOString(),
          companyInfo: parsed.companyInfo || initialCompanyInfo,
          fiscalYears: parsed.fiscalYears,
          selectedFiscalYearId: parsed.selectedFiscalYearId,
          properties: parsed.properties,
        });
      } catch (err: any) {
        reject(new Error('JSON読み込みエラー: ' + (err.message || 'データ構造が無効です')));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
    reader.readAsText(file);
  });
}
