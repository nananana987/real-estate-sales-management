import { useState, useEffect, useRef, useCallback } from 'react';
import { Property, FiscalYear, CompanyInfo, AppDataFile, FileSaveStatus } from '../types';
import {
  isFileSystemAccessSupported,
  getHandleFromIDB,
  storeHandleInIDB,
  clearHandleFromIDB,
  verifyHandlePermission,
  readFileData,
  writeFileData,
  pickAndOpenFile,
  pickAndCreateFile,
  exportManualDownload,
  importManualFile,
  buildInitialData,
} from './fileStorage';
import {
  saveProperties,
  saveFiscalYears,
  saveCompanyInfo,
  saveSelectedFiscalYearId,
} from './storage';

interface UseLocalFileStoreProps {
  properties: Property[];
  fiscalYears: FiscalYear[];
  selectedFYId: string;
  companyInfo: CompanyInfo;
  onDataLoaded: (data: AppDataFile) => void;
}

export function useLocalFileStore({
  properties,
  fiscalYears,
  selectedFYId,
  companyInfo,
  onDataLoaded,
}: UseLocalFileStoreProps) {
  const isSupported = isFileSystemAccessSupported();

  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<FileSaveStatus>(
    isSupported ? 'no_file' : 'unsupported'
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for debouncing and tracking latest state
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  fileHandleRef.current = fileHandle;

  const currentDataRef = useRef<AppDataFile>(
    buildInitialData(companyInfo, fiscalYears, properties, selectedFYId)
  );
  currentDataRef.current = buildInitialData(companyInfo, fiscalYears, properties, selectedFYId);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const isRestoringRef = useRef(false);

  // 1. 初回起動時: IndexedDBに以前開いたファイルハンドルが残っているか確認
  useEffect(() => {
    isMountedRef.current = true;
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    const restoreHandle = async () => {
      isRestoringRef.current = true;
      try {
        const { handle, meta } = await getHandleFromIDB();
        if (!isMountedRef.current) return;

        if (handle) {
          setFileHandle(handle);
          setFileName(handle.name || meta?.fileName || 'データファイル');

          // バックグラウンドで非侵襲的にパーミッション確認
          const hasPermission = await verifyHandlePermission(handle, false);
          if (!isMountedRef.current) return;

          if (hasPermission) {
            try {
              // 権限がある場合は直接ファイルを読み込んで最新状態へ同期
              const fileData = await readFileData(handle);
              if (isMountedRef.current) {
                onDataLoaded(fileData);
                setStatus('saved');
                setLastSavedAt(new Date());
              }
            } catch (err: any) {
              console.warn('[useLocalFileStore] ファイル読込失敗:', err);
              setStatus('error');
              setErrorMessage('保存先ファイルの読み込みに失敗しました: ' + (err.message || ''));
            }
          } else {
            // ブラウザの仕様上、再読み込み後はユーザー操作による再接続が必要
            setStatus('permission_needed');
          }
        } else {
          setStatus('no_file');
        }
      } catch (err: any) {
        console.warn('[useLocalFileStore] ハンドル復元エラー:', err);
        setStatus('no_file');
      } finally {
        isRestoringRef.current = false;
      }
    };

    restoreHandle();

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 2. オートセーブの実行
  const executeSave = useCallback(async (handleToUse?: FileSystemFileHandle) => {
    const targetHandle = handleToUse || fileHandleRef.current;
    if (!targetHandle) return;

    setStatus('saving');
    setErrorMessage(null);

    try {
      await writeFileData(targetHandle, currentDataRef.current);
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      console.error('[useLocalFileStore] オートセーブ失敗:', err);
      // パーミッション切れの可能性
      if (err.name === 'NotAllowedError') {
        setStatus('permission_needed');
        setErrorMessage('ファイルへの書き込みアクセス権限の再確認が必要です。');
      } else {
        setStatus('error');
        setErrorMessage('ファイルの保存に失敗しました: ' + (err.message || 'ディスク書き込みエラー'));
      }
    }
  }, []);

  // 3. データ変更検知（デバウンス付き自動上書き保存）
  useEffect(() => {
    // 復元処理中は自動上書きを行わない
    if (isRestoringRef.current) return;

    // ローカルストレージにも二重バックアップとして随時ミラーリング
    try {
      saveProperties(properties);
      saveFiscalYears(fiscalYears);
      saveCompanyInfo(companyInfo);
      saveSelectedFiscalYearId(selectedFYId);
    } catch (e) {
      // ignore
    }

    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    if (!fileHandle) {
      setStatus('no_file');
      return;
    }

    // パーミッション未承認時はオートセーブを保留
    if (status === 'permission_needed') {
      return;
    }

    setStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 800msデバウンスでファイル上書き保存
    debounceTimerRef.current = setTimeout(() => {
      executeSave();
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [properties, fiscalYears, selectedFYId, companyInfo, fileHandle, executeSave, isSupported]);

  // 4. アクション: 既存ファイルを開く
  const openFile = useCallback(async () => {
    try {
      setErrorMessage(null);
      const { handle, data, fileName: name } = await pickAndOpenFile();
      setFileHandle(handle);
      setFileName(name);
      onDataLoaded(data);
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'ファイルの読み込みに失敗しました。');
      }
    }
  }, [onDataLoaded]);

  // 5. アクション: 新規ファイルを作成して保存先にする
  const createNewFile = useCallback(async (suggestedName?: string) => {
    try {
      setErrorMessage(null);
      const current = currentDataRef.current;
      const { handle, fileName: name } = await pickAndCreateFile(current, suggestedName);
      setFileHandle(handle);
      setFileName(name);
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'ファイルの作成に失敗しました。');
      }
    }
  }, []);

  // 6. アクション: 別名で保存（複製）
  const saveAsNewFile = useCallback(async (suggestedName?: string) => {
    try {
      setErrorMessage(null);
      const current = currentDataRef.current;
      const { handle, fileName: name } = await pickAndCreateFile(current, suggestedName);
      setFileHandle(handle);
      setFileName(name);
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || '別名での保存に失敗しました。');
      }
    }
  }, []);

  // 7. アクション: 再接続（アクセス許可リクエスト）
  const requestPermissionAndReconnect = useCallback(async () => {
    if (!fileHandle) return;
    try {
      setErrorMessage(null);
      const granted = await verifyHandlePermission(fileHandle, true);
      if (granted) {
        // 最新データを読み込み
        const data = await readFileData(fileHandle);
        onDataLoaded(data);
        setStatus('saved');
        setLastSavedAt(new Date());
      } else {
        setStatus('permission_needed');
        setErrorMessage('ブラウザによりアクセス許可が拒否されました。再度お試しください。');
      }
    } catch (err: any) {
      setStatus('permission_needed');
      setErrorMessage('アクセス許可の取得に失敗しました: ' + (err.message || ''));
    }
  }, [fileHandle, onDataLoaded]);

  // 8. アクション: ファイルとの接続を解除
  const disconnectFile = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await clearHandleFromIDB();
    setFileHandle(null);
    setFileName(null);
    setStatus('no_file');
    setErrorMessage(null);
  }, []);

  // 9. アクション: 今すぐ保存（デバウンス待機をスキップ）
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (fileHandle) {
      await executeSave();
    } else if (isSupported) {
      // まだファイルがない場合は新規作成ピッカーを呼ぶ
      await createNewFile();
    } else {
      // 非対応の場合は手動ダウンロード
      exportManualDownload(currentDataRef.current);
    }
  }, [fileHandle, isSupported, executeSave, createNewFile]);

  // 10. フォールバック: 手動ダウンロード
  const handleExportFallback = useCallback((customName?: string) => {
    exportManualDownload(currentDataRef.current, customName);
  }, []);

  // 11. フォールバック: 手動インポート
  const handleImportFallback = useCallback(async (file: File) => {
    try {
      setErrorMessage(null);
      const data = await importManualFile(file);
      onDataLoaded(data);
      alert('JSONファイルを正常に読み込みました。');
    } catch (err: any) {
      alert(err.message || 'ファイルの読み込みに失敗しました。');
    }
  }, [onDataLoaded]);

  return {
    fileHandle,
    fileName,
    status,
    lastSavedAt,
    errorMessage,
    isSupported,
    openFile,
    createNewFile,
    saveAsNewFile,
    requestPermissionAndReconnect,
    disconnectFile,
    saveNow,
    exportManualDownload: handleExportFallback,
    importManualFile: handleImportFallback,
  };
}
