export type PropertyType = 'land' | 'building' | 'land_and_building';

export type LandCategory =
  | '宅地'
  | '畑'
  | '田'
  | '山林'
  | '原野'
  | '雑種地'
  | '公衆用道路'
  | 'その他';

export type PropertyStatus =
  | 'contracted_unsettled' // 仕入契約済・未決済
  | 'deposit_paid'         // 手付金支払済・決済待ち
  | 'inventory'            // 決済済・棚卸保有中
  | 'partially_sold'       // 一部売却済・残棚卸あり
  | 'sold_out';            // 全売却完了・決済済

export type IncidentalCostType =
  | '造成費用'
  | '登記費用'
  | '仲介手数料'
  | '解体費用'
  | '測量費用'
  | '印紙税'
  | '水道加入金・分担金'
  | '設計・地盤調査費用'
  | '修繕・リフォーム費用'
  | 'その他'
  | (string & {});

export type AttachmentDocType =
  | '売買契約書'
  | '重要事項説明書'
  | '決済精算書'
  | '請求書'
  | '領収書'
  | '見積書'
  | '公図・測量図'
  | '全部事項証明書(謄本)'
  | '案内図・物件資料'
  | 'その他'
  | (string & {});

export interface AttachmentFile {
  id: string;
  name: string; // 元ファイル名 (例: "売買契約書_26001.pdf")
  docType?: AttachmentDocType; // 書類種別ラベル (例: "売買契約書", "請求書", "公図・測量図")
  mimeType: string; // MIMEタイプ ("application/pdf", "image/jpeg", "image/png" 等)
  size: number; // ファイルサイズ (bytes)
  dataUrl: string; // Base64 Data URL
  createdAt: string; // 添付日時 (ISO文字列)
}

export interface IncidentalCost {
  id: string;
  propertyId: string;
  costType: IncidentalCostType;
  customCostTypeName?: string;
  payee: string; // 相手先
  paymentDate: string; // 支払日 (YYYY-MM-DD)
  amount: number; // 金額
  memo?: string; // 備考
  attachments?: AttachmentFile[]; // 請求書・領収書等の添付ファイル(複数可)
}

export type SaleCategory = 'full' | 'partial';

export interface SaleRecord {
  id: string;
  propertyId: string;
  buyerName: string; // 売上先 名前
  buyerAddress: string; // 売上先 住所
  saleType: PropertyType; // 種類 (土地/建物/土地建物)
  saleCategory: SaleCategory; // 全部売却 / 一部売却(分筆・分譲)
  partialSaleName?: string; // 区画名・号地名 (例: "A区画", "1号地", "持分1/2")
  soldLandArea?: number; // 売却土地面積 (㎡)
  soldBuildingArea?: number; // 売却建物面積 (㎡)
  contractDate: string; // 契約日 (YYYY-MM-DD)
  landPrice: number; // 土地売上金額 (非課税)
  buildingPrice: number; // 建物売上金額 (税抜または本体)
  buildingTax?: number; // 建物消費税
  settlementDate?: string; // 決済日・引渡入金日 (YYYY-MM-DD - 後から入力可能)
  depositAmount?: number; // 手付金額
  depositSettlementDate?: string; // 手付金決済入金日 (YYYY-MM-DD)
  fixedAssetTaxSettlementLand?: number; // 固定資産税等精算金 (土地・非課税)
  fixedAssetTaxSettlementBuilding?: number; // 固定資産税等精算金 (建物・課税)
  fixedAssetTaxSettlementBuildingTax?: number; // 固定資産税等精算金 (建物消費税)
  fixedAssetTaxSettlement?: number; // 固定資産税等精算金 合計 (入金)
  costOfGoodsSold: number; // 計上売上原価 (一部売却時の按分原価または完売時の原価)
  costCalculationNote?: string; // 売上原価の計算プロセス・根拠メモ
  memo?: string;
  attachments?: AttachmentFile[]; // 売却契約書・精算書等の添付ファイル(複数可)
}

export interface PurchaseRecord {
  id: string;
  propertyId?: string;
  label?: string; // 仕入区分・対象ラベル (例: "土地分", "建物分", "北側隣地", "持分1/2")
  sellerName: string; // 仕入先 名前 (売主名)
  sellerAddress: string; // 仕入先 住所
  purchaseType?: PropertyType; // 種類 (土地 / 建物 / 土地＋建物)
  landArea?: number; // 対象土地面積 (㎡)
  buildingArea?: number; // 対象建物面積 (㎡)
  contractDate: string; // 契約日 (YYYY-MM-DD)
  landPurchasePrice: number; // 土地仕入金額 (非課税)
  buildingPurchasePrice: number; // 建物仕入金額 (税込)
  buildingPurchaseTax?: number; // 建物仕入消費税
  settlementDate?: string; // 決済日・引渡支払日 (YYYY-MM-DD)
  depositAmount?: number; // 手付金額
  depositSettlementDate?: string; // 手付金決済支払日 (YYYY-MM-DD)
  fixedAssetTaxSettlementLand?: number; // 固定資産税等精算金 (土地・非課税)
  fixedAssetTaxSettlementBuilding?: number; // 固定資産税等精算金 (建物・税込)
  fixedAssetTaxSettlementBuildingTax?: number; // 固定資産税等精算金 (建物消費税)
  fixedAssetTaxSettlement?: number; // 固定資産税等精算金 合計
  memo?: string; // 備考
  attachments?: AttachmentFile[]; // 仕入契約書・重説・精算書等の添付ファイル(複数可)
}

export interface Property {
  id: string;
  code: string; // 管理番号 (例: 26001 - 西暦下2桁+001連番)
  name?: string; // (互換用)
  location: string; // 物件所在地 / 地番
  fiscalYearId?: string; // 登録年度ID (例: "fy-2026")
  sellerName: string; // 仕入先 名前 (複数の場合は合算表示用)
  sellerAddress: string; // 仕入先 住所
  propertyType: PropertyType; // 種類 (土地 / 建物 / 土地＋建物)
  landCategory: string; // 地目 (宅地など)
  landArea: number; // 土地面積 (㎡)
  buildingArea?: number; // 建物面積 (㎡)
  
  // 仕入契約情報 (単一または複数仕入の合算サマリー)
  contractDate: string; // 契約日 (YYYY-MM-DD)
  landPurchasePrice: number; // 土地仕入金額
  buildingPurchasePrice: number; // 建物仕入金額
  buildingPurchaseTax?: number; // 建物仕入消費税
  settlementDate?: string; // 決済日・引渡支払日 (YYYY-MM-DD - 後から入力可能)
  depositAmount?: number; // 手付金額
  depositSettlementDate?: string; // 手付金決済支払日 (YYYY-MM-DD)
  fixedAssetTaxSettlementLand?: number; // 固定資産税等精算金 (土地・非課税)
  fixedAssetTaxSettlementBuilding?: number; // 固定資産税等精算金 (建物・課税)
  fixedAssetTaxSettlementBuildingTax?: number; // 固定資産税等精算金 (建物消費税)
  fixedAssetTaxSettlement?: number; // 固定資産税等精算金 合計 (支払 - 仕入原価算入)

  // 複数仕入レコード (土地・建物別売主や複数筆の合算管理用)
  purchases?: PurchaseRecord[];

  // 繰越情報 (前期からの繰越物件の場合)
  isCarriedOver?: boolean;
  initialInventoryCost?: number; // 期首棚卸金額 (繰越原価)
  initialInventoryNote?: string; // 繰越時の内訳メモ

  // 関連データ
  incidentalCosts: IncidentalCost[];
  sales: SaleRecord[];

  // 物件基本資料の添付ファイル (公図・測量図・謄本・案内図等、複数可)
  attachments?: AttachmentFile[];

  // 補足メモ
  notes?: string;
  statusOverride?: PropertyStatus; // 手動指定がある場合

  createdAt: string;
  updatedAt: string;
}

export interface CompanyInfo {
  name: string; // 会社名・商号 (例: 株式会社〇〇不動産)
  representative?: string; // 代表者名
  address?: string; // 本社所在地
  phone?: string; // 電話番号
  fiscalMonth?: number; // 決算月 (1〜12)
  taxOffice?: string; // 所轄税務署
  advisorTaxAccountant?: string; // 担当税理士・会計事務所名
  notes?: string; // 備考・特記事項
}

export interface FiscalYear {
  id: string;
  name: string; // 例: "第25期 (2025/04/01〜2026/03/31)"
  periodNumber: number; // 期数 例: 25
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean; // 現在選択されている事業年度
  isClosed?: boolean; // 決算確定・クローズ済フラグ
}

export interface AccountingMatchSummary {
  fiscalYear: FiscalYear;
  // 1. 仕入科目 (本体仕入 + 付随費用)
  purchaseLandTotal: number; // 土地仕入
  purchaseBuildingTotal: number; // 建物仕入
  purchaseFixedAssetTaxLandTotal: number; // 固定資産税精算金(土地・非課税)
  purchaseFixedAssetTaxBuildingTotal: number; // 固定資産税精算金(建物・課税)
  purchaseFixedAssetTaxTotal: number; // 固定資産税精算金 合計(支払)
  incidentalCostsTotal: number; // 付随費用合計
  totalPurchaseAccount: number; // 「仕入」科目計上合計 (土地+建物+精算金+付随費用)

  // 2. 売上科目
  salesLandTotal: number; // 「土地売上」科目合計
  salesBuildingTotal: number; // 「建物売上」科目合計
  salesFixedAssetTaxLandTotal: number; // 固定資産税精算金(土地・非課税)受取
  salesFixedAssetTaxBuildingTotal: number; // 固定資産税精算金(建物・課税)受取
  salesFixedAssetTaxTotal: number; // 固定資産税精算金 合計(受取)
  totalSales: number; // 総売上高 (土地売上+建物売上+精算金受取)

  // 3. 原価・棚卸
  beginningInventoryTotal: number; // 期首商品棚卸高
  costOfGoodsSoldTotal: number; // 当期売上原価
  endingInventoryTotal: number; // 期末商品棚卸高 (期首 + 当期仕入 - 当期売上原価)
  grossProfit: number; // 売上総利益 (総売上 - 当期売上原価)
  profitMargin: number; // 利益率 (%)
}

export interface PropertyFinancials {
  status: PropertyStatus;
  statusLabel: string;
  // 面積坪換算
  landAreaTsubo: number;
  buildingAreaTsubo: number;
  // 仕入関連合計
  purchaseBaseTotal: number; // 土地仕入 + 建物仕入 + 固定資産税精算金 (全契約)
  purchaseFixedAssetTaxLand: number; // 固定資産税精算金 (土地)
  purchaseFixedAssetTaxBuilding: number; // 固定資産税精算金 (建物本体)
  purchaseFixedAssetTaxBuildingTax: number; // 固定資産税精算金 (建物消費税)
  purchaseFixedAssetTaxTotal: number; // 固定資産税精算金 合計
  incidentalCostsTotal: number; // 付随費用累計 (未払含む全体)
  totalAcquisitionCost: number; // 初期繰越 + 仕入本体 + 付随費用 (未決済・未払含む全体)
  // 決済済みの仕入・支払済みの付随費用（期末棚卸残高の算定対象）
  settledPurchaseBaseTotal: number; // 決済済みの仕入本体合計
  settledIncidentalCostsTotal: number; // 支払済みの付随費用合計
  settledAcquisitionCost: number; // 決済済みの総仕入原価 (期首繰越 + 決済済仕入 + 支払済付随費用)
  unsettledPurchaseTotal: number; // 未決済の仕入本体合計
  unpaidIncidentalCostsTotal: number; // 未払いの付随費用合計
  // 売上関連合計
  totalSalesAmount: number; // 累計売上高 (全売上レコード)
  settledSalesAmount: number; // 決済済売上高
  // 原価・棚卸
  beginningInventory: number; // 当期期首棚卸高 (前期繰越棚卸残高)
  totalCostOfGoodsSold: number; // 計上売上原価累計
  endingInventory: number; // 現在の棚卸金額 (決済済総仕入原価 - 計上売上原価、未決済仕入・未払付随費用は含めない)
  grossProfit: number; // 確定粗利 (決済済売上 - 計上売上原価)
  grossProfitMargin: number; // 粗利率
  // 当期取引金額 (選択事業年度内での判定)
  currentPeriodPurchase: number; // 当期決済仕入 + 当期支払付随費用
  currentPeriodSalesLand: number; // 当期決済土地売上
  currentPeriodSalesBuilding: number; // 当期決済建物売上
  currentPeriodSalesTotal: number; // 当期決済売上合計
  currentPeriodCOGS: number; // 当期計上売上原価
  isPurchasedInCurrentPeriod: boolean; // 当期仕入物件か
  isSoldInCurrentPeriod: boolean; // 当期売却物件か (一部含む)
  isInventoryInCurrentPeriod: boolean; // 当期末棚卸物件か
}

export interface AppDataFile {
  version: string;
  appName?: string;
  lastModified?: string;
  companyInfo: CompanyInfo;
  fiscalYears: FiscalYear[];
  selectedFiscalYearId?: string;
  properties: Property[];
}

export type FileSaveStatus =
  | 'saved'              // ファイルへ保存済み
  | 'saving'             // ファイルへ書き込み中...
  | 'unsaved'            // 未保存の変更あり（デバウンス待機中）
  | 'no_file'            // ファイル未選択（ブラウザ内一時動作中）
  | 'permission_needed'  // 再接続の許可が必要
  | 'error'              // 保存エラー
  | 'unsupported';       // File System Access API非対応ブラウザ
