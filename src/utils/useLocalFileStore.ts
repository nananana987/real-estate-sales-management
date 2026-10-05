import { useState, useEffect, useRef, useCallback } from 'react';
import { Property, FiscalYear, CompanyInfo, AppDataFile, FileSaveStatus } from '../types';
import {
  isFileSystemAccessSupported,
  getHandleFromIDB,
  clearHandleFromIDB,
  queryHandlePermission,
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

  // ファイルへの書き込み権限が現在のブラウザセッションで有効か追跡
  const hasWritePermissionRef = useRef(false);

  // 最新のfileHandleを保持するref
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  fileHandleRef.current = fileHandle;

  // 業務データの比較用シリアライズ関数（lastModifiedなどのタイムスタンプを除外し純粋なデータ差分のみを判定）
  const serializeBusinessData = useCallback((props: Property[], fys: FiscalYear[], comp: CompanyInfo, fyId: string) => {
    return JSON.stringify({
      companyInfo: comp,
      fiscalYears: fys,
      selectedFiscalYearId: fyId,
      properties: props,
    });
  }, []);

  // 最後に読み込みまたは保存したデータのスナップショット（起動時・読込直後の不要な自動保存書き込みを防止）
  const lastSavedSnapshotRef = useRef<string>(
    serializeBusinessData(properties, fiscalYears, companyInfo, selectedFYId)
  );

  // ユーザーによる画面上のデータ編集が行われたか追跡
  const hasUserEditedRef = useRef(false);

  const currentDataRef = useRef<AppDataFile>(
    buildInitialData(companyInfo, fiscalYears, properties, selectedFYId)
  );
  currentDataRef.current = buildInitialData(companyInfo, fiscalYears, properties, selectedFYId);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const isRestoringRef = useRef(true);

  // 1. 初回起動時: IndexedDBに以前開いたファイルハンドルが残っているか確認
  useEffect(() => {
    isMountedRef.current = true;
    if (!isSupported) {
      setStatus('unsupported');
      isRestoringRef.current = false;
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

          // 非侵襲的に読み込み権限を確認（ダイアログは出さない）
          const readPerm = await queryHandlePermission(handle, 'read');
          if (!isMountedRef.current) return;

          if (readPerm === 'granted') {
            try {
              const fileData = await readFileData(handle);
              if (isMountedRef.current) {
                onDataLoaded(fileData);
                // メモリ上のデータがファイル内容と同一であることをスナップショットに記録
                lastSavedSnapshotRef.current = serializeBusinessData(
                  fileData.properties,
                  fileData.fiscalYears,
                  fileData.companyInfo,
                  fileData.selectedFiscalYearId
                );
              }
            } catch (readErr) {
              console.warn('[useLocalFileStore] 起動時ファイル読込スキップ:', readErr);
            }
          }

          // 非侵襲的に書き込み権限を確認（ユーザー操作なしで権限ダイアログを起動しない）
          const writePerm = await queryHandlePermission(handle, 'readwrite');
          if (!isMountedRef.current) return;

          if (writePerm === 'granted') {
            hasWritePermissionRef.current = true;
            setStatus('saved');
            setLastSavedAt(new Date());
          } else {
            // ブラウザ再起動後は書き込み権限がpromptとなるため、ユーザーの許可が必要
            // ここで自動保存を行わず、バナーで明示的に「アクセスを許可して再接続」を案内する
            hasWritePermissionRef.current = false;
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
  }, [isSupported, onDataLoaded, serializeBusinessData]);

  // 2. オートセーブの実行
  const executeSave = useCallback(async (handleToUse?: FileSystemFileHandle) => {
    const targetHandle = handleToUse || fileHandleRef.current;
    if (!targetHandle) return;

    // 書き込み権限がない場合、バックグラウンドでのcreateWritable呼び出しは厳禁（ブラウザがSecurityErrorを投げるため）
    if (!hasWritePermissionRef.current) {
      setStatus('permission_needed');
      return;
    }

    setStatus('saving');
    setErrorMessage(null);

    try {
      await writeFileData(targetHandle, currentDataRef.current);
      lastSavedSnapshotRef.current = serializeBusinessData(
        currentDataRef.current.properties,
        currentDataRef.current.fiscalYears,
        currentDataRef.current.companyInfo,
        currentDataRef.current.selectedFiscalYearId
      );
      hasUserEditedRef.current = false;
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      console.error('[useLocalFileStore] オートセーブ失敗:', err);
      // パーミッションまたはユーザーアクティベーション不足によるエラーを適切に判定
      const isPermissionErr =
        err.name === 'NotAllowedError' ||
        err.name === 'SecurityError' ||
        (typeof err.message === 'string' && (
          err.message.includes('User activation is required') ||
          err.message.includes('permission') ||
          err.message.includes('Permission')
        ));

      if (isPermissionErr) {
        hasWritePermissionRef.current = false;
        setStatus('permission_needed');
        setErrorMessage('保存先ファイルへのアクセス許可が必要です。「アクセスを許可して再接続」をクリックしてください。');
      } else {
        setStatus('error');
        setErrorMessage('ファイルの保存に失敗しました: ' + (err.message || 'ディスク書き込みエラー'));
      }
    }
  }, [serializeBusinessData]);

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

    // 業務データが前回の保存・読込内容と実際に変化したか検証
    const currentSnapshot = serializeBusinessData(properties, fiscalYears, companyInfo, selectedFYId);
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      // データに変更なし（起動直後や同一データ再描画など）: 保存不要
      return;
    }

    // 実際にユーザーの編集操作等によってデータが変化した
    hasUserEditedRef.current = true;

    // 書き込み権限がまだ得られていない場合はタイマーによる自動保存を行わず、permission_neededを維持
    if (!hasWritePermissionRef.current || status === 'permission_needed') {
      setStatus('permission_needed');
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
  }, [
    properties,
    fiscalYears,
    selectedFYId,
    companyInfo,
    fileHandle,
    executeSave,
    isSupported,
    status,
    serializeBusinessData,
  ]);

  // 4. アクション: 既存ファイルを開く
  const openFile = useCallback(async () => {
    try {
      setErrorMessage(null);
      const { handle, data, fileName: name } = await pickAndOpenFile();
      setFileHandle(handle);
      setFileName(name);
      hasWritePermissionRef.current = true;
      onDataLoaded(data);
      lastSavedSnapshotRef.current = serializeBusinessData(
        data.properties,
        data.fiscalYears,
        data.companyInfo,
        data.selectedFiscalYearId
      );
      hasUserEditedRef.current = false;
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'ファイルの読み込みに失敗しました。');
      }
    }
  }, [onDataLoaded, serializeBusinessData]);

  // 5. アクション: 新規ファイルを作成して保存先にする
  const createNewFile = useCallback(async (suggestedName?: string) => {
    try {
      setErrorMessage(null);
      const current = currentDataRef.current;
      const { handle, fileName: name } = await pickAndCreateFile(current, suggestedName);
      setFileHandle(handle);
      setFileName(name);
      hasWritePermissionRef.current = true;
      lastSavedSnapshotRef.current = serializeBusinessData(
        current.properties,
        current.fiscalYears,
        current.companyInfo,
        current.selectedFiscalYearId
      );
      hasUserEditedRef.current = false;
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'ファイルの作成に失敗しました。');
      }
    }
  }, [serializeBusinessData]);

  // 6. アクション: 別名で保存（複製）
  const saveAsNewFile = useCallback(async (suggestedName?: string) => {
    try {
      setErrorMessage(null);
      const current = currentDataRef.current;
      const { handle, fileName: name } = await pickAndCreateFile(current, suggestedName);
      setFileHandle(handle);
      setFileName(name);
      hasWritePermissionRef.current = true;
      lastSavedSnapshotRef.current = serializeBusinessData(
        current.properties,
        current.fiscalYears,
        current.companyInfo,
        current.selectedFiscalYearId
      );
      hasUserEditedRef.current = false;
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || '別名での保存に失敗しました。');
      }
    }
  }, [serializeBusinessData]);

  // 7. アクション: 再接続（アクセス許可リクエスト）- ユーザー操作起点
  const requestPermissionAndReconnect = useCallback(async () => {
    if (!fileHandle) return;
    try {
      setErrorMessage(null);
      // ユーザーの明示クリックによる実行なので withPrompt: true
      const granted = await verifyHandlePermission(fileHandle, true);
      if (granted) {
        hasWritePermissionRef.current = true;

        if (hasUserEditedRef.current) {
          // 権限再接続前に編集があった場合は現在のメモリ内データをファイルへ保存
          await executeSave(fileHandle);
        } else {
          // 未編集の場合はPCファイル側の最新データを読み込んでアプリと同期
          const data = await readFileData(fileHandle);
          onDataLoaded(data);
          lastSavedSnapshotRef.current = serializeBusinessData(
            data.properties,
            data.fiscalYears,
            data.companyInfo,
            data.selectedFiscalYearId
          );
          setStatus('saved');
          setLastSavedAt(new Date());
        }
      } else {
        hasWritePermissionRef.current = false;
        setStatus('permission_needed');
        setErrorMessage('ブラウザによりアクセス許可が拒否されました。再度お試しください。');
      }
    } catch (err: any) {
      hasWritePermissionRef.current = false;
      setStatus('permission_needed');
      setErrorMessage('アクセス許可の取得に失敗しました: ' + (err.message || ''));
    }
  }, [fileHandle, onDataLoaded, executeSave, serializeBusinessData]);

  // 8. アクション: ファイルとの接続を解除
  const disconnectFile = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await clearHandleFromIDB();
    setFileHandle(null);
    setFileName(null);
    hasWritePermissionRef.current = false;
    hasUserEditedRef.current = false;
    setStatus('no_file');
    setErrorMessage(null);
  }, []);

  // 9. アクション: 今すぐ保存（デバウンス待機をスキップ）- ユーザー操作起点
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (fileHandle) {
      // ユーザーの明示操作なので権限確認ダイアログを出せる
      const granted = await verifyHandlePermission(fileHandle, true);
      if (granted) {
        hasWritePermissionRef.current = true;
        await executeSave(fileHandle);
      } else {
        hasWritePermissionRef.current = false;
        setStatus('permission_needed');
      }
    } else if (isSupported) {
      await createNewFile();
    } else {
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
      lastSavedSnapshotRef.current = serializeBusinessData(
        data.properties,
        data.fiscalYears,
        data.companyInfo,
        data.selectedFiscalYearId
      );
      hasUserEditedRef.current = false;
      alert('JSONファイルを正常に読み込みました。');
    } catch (err: any) {
      alert(err.message || 'ファイルの読み込みに失敗しました。');
    }
  }, [onDataLoaded, serializeBusinessData]);

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
