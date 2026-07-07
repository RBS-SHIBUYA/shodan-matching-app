import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Store, Users, Package, Upload, Image as ImageIcon,
  ClipboardList, Bell, History, ListChecks, CalendarClock, MessageSquare,
  Send, Settings, Search, ChevronDown, ChevronUp, X, Mail, Phone,
  CheckCircle2, AlertTriangle, Clock, Calendar, ChevronRight, Info,
  UploadCloud, Star, ArrowLeft, ArrowRight,
} from 'lucide-react';

/* =========================================================================
   定数・カラーパレット
   ========================================================================= */

const COLOR = {
  navy: '#122140',
  navyPanel: '#1D3357',
  blue: '#2F6FED',
};

const TODAY_STR = '2026-07-05';
const ROLES = ['システム管理者', '事務局担当者', '閲覧担当者', '出展者', 'バイヤー'];
const STAFF_LIST = ['中野', '岡田', '石井', '藤井'];

const ITEM_DEFS = [
  { key: 'basicInfo', label: '基本情報' },
  { key: 'productInfo', label: '商品情報' },
  { key: 'productImage', label: '商品画像' },
  { key: 'meetingRequest', label: '面談希望' },
  { key: 'preferredTime', label: '希望時間' },
  { key: 'scheduleConfirm', label: 'スケジュール確認' },
];

const REQUIRED_ITEMS_BY_TYPE = {
  '出展者': ['basicInfo', 'productInfo', 'productImage', 'meetingRequest', 'preferredTime', 'scheduleConfirm'],
  'バイヤー': ['basicInfo', 'meetingRequest', 'preferredTime', 'scheduleConfirm'],
};

const STATUS_OPTIONS = ['未着手', '入力中', '提出済み', '修正依頼中', '確認済み', '期限超過', '回答不要'];
const COMPLETE_STATUSES = ['提出済み', '確認済み'];

const ACTION_STATE_OPTIONS = ['未対応', '送信予定', '送信済み', '対象除外', '個別対応中', '期限延長中', '参加辞退', '紹介元対応中', 'リマインド停止', '回答不要'];
const EXCLUDED_ACTION_STATES = ['個別対応中', '期限延長中', '参加辞退', '紹介元対応中', 'リマインド停止', '回答不要'];

const STATUS_STYLE = {
  '未着手': 'bg-gray-100 text-gray-600 border-gray-300',
  '入力中': 'bg-blue-50 text-blue-700 border-blue-200',
  '提出済み': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  '修正依頼中': 'bg-orange-50 text-orange-700 border-orange-300',
  '確認済み': 'bg-green-50 text-green-700 border-green-300',
  '期限超過': 'bg-red-50 text-red-700 border-red-300',
  '回答不要': 'bg-gray-50 text-gray-400 border-gray-200 border-dashed',
};

const ACTION_STYLE = {
  '未対応': 'bg-gray-100 text-gray-600 border-gray-300',
  '送信予定': 'bg-blue-50 text-blue-700 border-blue-200',
  '送信済み': 'bg-green-50 text-green-700 border-green-300',
  '対象除外': 'bg-slate-100 text-slate-400 border-slate-200',
  '個別対応中': 'bg-purple-50 text-purple-700 border-purple-300',
  '期限延長中': 'bg-amber-50 text-amber-700 border-amber-300',
  '参加辞退': 'bg-gray-200 text-gray-500 border-gray-300',
  '紹介元対応中': 'bg-indigo-50 text-indigo-700 border-indigo-300',
  'リマインド停止': 'bg-rose-50 text-rose-700 border-rose-300',
  '回答不要': 'bg-gray-50 text-gray-400 border-gray-200 border-dashed',
  '一定期間内に連絡済み': 'bg-slate-100 text-slate-500 border-slate-300',
};

const ACTION_SUGGESTION = {
  important: '重要な変更が未確認のため、SMSで至急ご連絡ください',
  over: '期限超過のため、SMSでのリマインドをご検討ください',
  d1: '期限前日のため、SMSでのリマインドをご検討ください',
  fix3: '修正依頼が未対応のため、SMSでのリマインドをご検討ください',
  d3: 'メールでリマインドを送信するか、管理者にご確認ください',
  sched3: 'スケジュール未確認のため、SMSでのリマインドをご検討ください',
  d7: '事前案内メールを送信してください',
};

const EVENT_NAME = '食のコネクト商談会2026';
const OFFICE_NAME = '食のコネクト商談会事務局';
const CONTACT_INFO = 'TEL 03-0000-1234 / MAIL info@shoku-connect.example.jp';
const ENTRY_URL_BASE = 'https://shoku-connect.example.jp/entry';

/* --- SMSリマインド 定数(第5段階) --- */
const SMS_RECENT_THRESHOLD_DAYS = 2; // この日数以内にSMS送信済みなら対象外
const SMS_SEND_MODES = ['管理者承認後に送信', '予約送信', '条件付き自動送信', '下書き保存', '送信対象から除外'];
const SMS_CONSENT_OPTIONS = ['同意', '未同意', '停止希望'];
const SMS_COST_PER_MESSAGE = 3; // 円(仮の想定値。実際の配信サービスの料金に応じて調整してください)
const SMS_URL_BASE = 'https://shoku-connect.example.jp/r'; // デモ用の回答専用URLのベース(電話番号は含めない)
const SMS_TOKEN_VALID_DAYS = 7;
const EXTERNAL_SMS_SERVICE_NAME = '(未接続・試作用モック)国内SMS配信サービス';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard, active: true },
  { key: 'exhibitors', label: '出展者一覧', icon: Store, active: true },
  { key: 'buyers', label: 'バイヤー一覧', icon: Users, active: true },
  { key: 'products', label: '商品一覧', icon: Package, active: true },
  { key: 'csv', label: 'CSVアップロード', icon: Upload, active: true },
  { key: 'productImages', label: '商品画像登録', icon: ImageIcon, active: true },
  { key: 'progress', label: '進捗管理', icon: ClipboardList, active: true },
  { key: 'reminder', label: 'リマインド管理', icon: Bell, active: true },
  { key: 'reminderHistory', label: 'リマインド履歴', icon: History, active: true },
  { key: 'meetingRequests', label: '面談希望管理', icon: ListChecks, active: true },
  { key: 'matching', label: 'マッチング候補一覧', icon: Users, active: true },
  { key: 'schedule', label: 'タイムスケジュール調整', icon: CalendarClock, active: true },
  { key: 'sms', label: 'SMS送信管理', icon: MessageSquare, active: true },
  { key: 'sendHistory', label: '送信履歴', icon: Send, active: false },
  { key: 'settings', label: '各種設定', icon: Settings, active: false },
];

const EXHIBITOR_CATEGORIES = ['すべて', '農産加工品', '調味料・油', '水産加工品', '発酵食品', '菓子', '飲料・茶', '乾物・香辛料', 'パン・洋菓子', '果実加工品', '麺類'];
const BUYER_BUSINESS_TYPES = ['すべて', '卸売', 'スーパーマーケット', '外食チェーン', '百貨店', '自然食品専門店'];
const INDUSTRY_OPTIONS = EXHIBITOR_CATEGORIES.filter((c) => c !== 'すべて').concat(BUYER_BUSINESS_TYPES.filter((c) => c !== 'すべて'));
const PRODUCT_CATEGORY_OPTIONS = EXHIBITOR_CATEGORIES.filter((c) => c !== 'すべて');
const COMPANY_STATUS_OPTIONS = ['仮登録', '本登録', '保留'];
const TEMPERATURE_OPTIONS = ['常温', '冷蔵', '冷凍'];

/* =========================================================================
   CSV取込 項目定義
   ========================================================================= */

const COMPANY_FIELDS = [
  { key: 'companyId', label: '会社ID', required: true, type: 'id', maxLength: 10 },
  { key: 'companyName', label: '会社名', required: true, type: 'text', maxLength: 40 },
  { key: 'companyNameKana', label: '会社名カナ', required: false, type: 'text', maxLength: 60 },
  { key: 'kubun', label: '出展者・バイヤー区分', required: true, type: 'kubun' },
  { key: 'postalCode', label: '郵便番号', required: false, type: 'text', maxLength: 8 },
  { key: 'address', label: '所在地', required: false, type: 'text', maxLength: 100 },
  { key: 'phone', label: '電話番号', required: false, type: 'text', maxLength: 20 },
  { key: 'mobile', label: '携帯電話番号', required: true, type: 'mobile' },
  { key: 'website', label: 'Webサイト', required: false, type: 'text', maxLength: 100 },
  { key: 'industry', label: '業種', required: false, type: 'category', allowed: INDUSTRY_OPTIONS },
  { key: 'introduction', label: '会社紹介', required: false, type: 'text', maxLength: 200 },
  { key: 'referral', label: '紹介元', required: false, type: 'text', maxLength: 40 },
  { key: 'department', label: '担当部署', required: false, type: 'text', maxLength: 30 },
  { key: 'contactName', label: '担当者名', required: true, type: 'text', maxLength: 20 },
  { key: 'email', label: 'メールアドレス', required: true, type: 'email' },
  { key: 'note', label: '備考', required: false, type: 'text', maxLength: 200 },
  { key: 'companyStatus', label: 'ステータス', required: false, type: 'category', allowed: COMPANY_STATUS_OPTIONS },
];

const CONTACT_FIELDS = [
  { key: 'companyId', label: '会社ID', required: true, type: 'idRef' },
  { key: 'department', label: '部署', required: false, type: 'text', maxLength: 30 },
  { key: 'contactName', label: '担当者名', required: true, type: 'text', maxLength: 20 },
  { key: 'role', label: '役職', required: false, type: 'text', maxLength: 20 },
  { key: 'email', label: 'メールアドレス', required: true, type: 'email' },
  { key: 'mobile', label: '携帯電話番号', required: false, type: 'mobile' },
  { key: 'isPrimary', label: '主担当', required: false, type: 'category', allowed: ['はい', 'いいえ'] },
];

const PRODUCT_FIELDS = [
  { key: 'productId', label: '商品ID', required: true, type: 'id', maxLength: 10 },
  { key: 'companyId', label: '会社ID', required: true, type: 'idRef' },
  { key: 'productName', label: '商品名', required: true, type: 'text', maxLength: 40 },
  { key: 'category', label: '商品カテゴリー', required: true, type: 'category', allowed: PRODUCT_CATEGORY_OPTIONS },
  { key: 'subCategory', label: 'サブカテゴリー', required: false, type: 'text', maxLength: 30 },
  { key: 'description', label: '商品説明', required: false, type: 'text', maxLength: 200 },
  { key: 'features', label: '商品の特徴', required: false, type: 'text', maxLength: 200 },
  { key: 'targetCustomer', label: '想定顧客', required: false, type: 'text', maxLength: 60 },
  { key: 'desiredBuyer', label: '希望販売先', required: false, type: 'text', maxLength: 60 },
  { key: 'channel', label: '販売チャネル', required: false, type: 'text', maxLength: 60 },
  { key: 'retailPrice', label: '小売価格', required: false, type: 'number' },
  { key: 'wholesalePrice', label: '卸売価格', required: false, type: 'number' },
  { key: 'minOrderQty', label: '最低発注量', required: false, type: 'number' },
  { key: 'area', label: '対応エリア', required: false, type: 'text', maxLength: 60 },
  { key: 'temperatureZone', label: '温度帯', required: false, type: 'category', allowed: TEMPERATURE_OPTIONS },
  { key: 'expiry', label: '賞味期限', required: false, type: 'date' },
  { key: 'certification', label: '認証', required: false, type: 'text', maxLength: 60 },
  { key: 'allergen', label: 'アレルゲン', required: false, type: 'text', maxLength: 60 },
  { key: 'jan', label: 'JANコード', required: false, type: 'text', maxLength: 13 },
  { key: 'pitch', label: '商談時の訴求ポイント', required: false, type: 'text', maxLength: 200 },
];

const IMPORT_TYPES = {
  exhibitorCompany: { label: '出展者会社情報', fields: COMPANY_FIELDS, kind: 'company', fixedKubun: '出展者' },
  buyerCompany: { label: 'バイヤー会社情報', fields: COMPANY_FIELDS, kind: 'company', fixedKubun: 'バイヤー' },
  contact: { label: '担当者情報', fields: CONTACT_FIELDS, kind: 'contact' },
  product: { label: '商品情報', fields: PRODUCT_FIELDS, kind: 'product' },
};

/* =========================================================================
   マッチングエンジン 定数
   ========================================================================= */

const MAX_MEETINGS_PER_COMPANY = 6;

const MATCH_CATEGORY_STYLE = {
  '相互希望': 'bg-green-50 text-green-700 border-green-300',
  'バイヤー希望': 'bg-blue-50 text-blue-700 border-blue-200',
  '出展者希望': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'システム推奨': 'bg-purple-50 text-purple-700 border-purple-300',
  '対応不可': 'bg-red-50 text-red-700 border-red-300',
};

const BUSINESS_CHANNEL_MAP = {
  '卸売': '卸売',
  'スーパーマーケット': '卸売',
  '外食チェーン': '卸売',
  '百貨店': '直販',
  '自然食品専門店': '直販',
};

const REGION_KEYWORDS = [
  { region: '北海道', match: ['北海道'] },
  { region: '東北', match: ['宮城', '青森', '岩手', '秋田', '山形', '福島'] },
  { region: '関東', match: ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'] },
  { region: '中部', match: ['愛知', '長野', '岐阜', '静岡', '山梨', '新潟', '富山', '石川', '福井'] },
  { region: '近畿', match: ['大阪', '京都', '兵庫', '奈良', '滋賀', '和歌山'] },
  { region: '中国', match: ['広島', '岡山', '山口', '島根', '鳥取'] },
  { region: '四国', match: ['香川', '愛媛', '徳島', '高知'] },
  { region: '九州', match: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島'] },
  { region: '沖縄', match: ['沖縄'] },
];

/* =========================================================================
   ユーティリティ関数
   ========================================================================= */

function parseDate(s) { return new Date(s + 'T00:00:00'); }
function daysBetween(a, b) { return Math.round((a - b) / 86400000); }
const TODAY = parseDate(TODAY_STR);

function fmtDate(s) {
  if (!s) return '';
  const d = parseDate(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function nowTimestamp() {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  return `${TODAY_STR} ${hh}:${mm}`;
}

function calcProgress(p) {
  const required = REQUIRED_ITEMS_BY_TYPE[p.type];
  let total = 0, done = 0;
  required.forEach((key) => {
    const st = p.items[key];
    if (st === '回答不要') return;
    total++;
    if (COMPLETE_STATUSES.includes(st)) done++;
  });
  if (total === 0) return 100;
  return Math.round((done / total) * 100);
}

function regStatusLabel(p) {
  const pct = calcProgress(p);
  if (pct === 0) return '未着手';
  if (pct === 100) return '登録完了';
  return '対応中';
}

function incompleteItemLabels(p) {
  return REQUIRED_ITEMS_BY_TYPE[p.type]
    .filter((k) => p.items[k] !== '回答不要' && !COMPLETE_STATUSES.includes(p.items[k]))
    .map((k) => ITEM_DEFS.find((d) => d.key === k).label);
}

function daysLeft(p) { return daysBetween(parseDate(p.deadline), TODAY); }

function daysLeftLabel(p) {
  const d = daysLeft(p);
  if (d < 0) return { text: `${Math.abs(d)}日超過`, cls: 'text-red-600 font-semibold' };
  if (d === 0) return { text: '本日締切', cls: 'text-red-600 font-semibold' };
  if (d <= 3) return { text: `あと${d}日`, cls: 'text-orange-600 font-semibold' };
  if (d <= 7) return { text: `あと${d}日`, cls: 'text-amber-600' };
  return { text: `あと${d}日`, cls: 'text-slate-500' };
}

function computeReminderReasons(p) {
  const reasons = [];
  if (p.importantChangeUnconfirmed) reasons.push({ code: 'important', label: '重要な変更未確認', severity: 6 });
  if (calcProgress(p) === 100) return reasons;
  const dl = daysLeft(p);
  if (dl === 7) reasons.push({ code: 'd7', label: '期限7日前', severity: 2 });
  if (dl === 3) reasons.push({ code: 'd3', label: '期限3日前', severity: 3 });
  if (dl === 1) reasons.push({ code: 'd1', label: '期限前日', severity: 4 });
  if (dl < 0) reasons.push({ code: 'over', label: '期限超過', severity: 5 });
  if (p.modifiedRequestDate) {
    const days = daysBetween(TODAY, parseDate(p.modifiedRequestDate));
    if (days >= 3) reasons.push({ code: 'fix3', label: '修正依頼未対応(3日経過)', severity: 4 });
  }
  if (p.scheduleTentativePublishedDate && p.items.scheduleConfirm !== '確認済み' && p.items.scheduleConfirm !== '回答不要') {
    const days = daysBetween(TODAY, parseDate(p.scheduleTentativePublishedDate));
    if (days >= 3) reasons.push({ code: 'sched3', label: 'スケジュール未確認(3日経過)', severity: 3 });
  }
  return reasons;
}

function exclusionReason(p) {
  if (EXCLUDED_ACTION_STATES.includes(p.actionState)) return p.actionState;
  if (p.lastContactDate && daysBetween(TODAY, parseDate(p.lastContactDate)) <= 1) return '一定期間内に連絡済み';
  return null;
}

function isReminderTarget(p) {
  return computeReminderReasons(p).length > 0 && !exclusionReason(p);
}

function suggestedActionFor(p) {
  const reasons = computeReminderReasons(p);
  if (reasons.length === 0) return '-';
  const top = reasons.reduce((a, b) => (b.severity > a.severity ? b : a));
  return ACTION_SUGGESTION[top.code];
}

function buildMessages(p) {
  const items = incompleteItemLabels(p).join('、') || 'なし';
  const url = `${ENTRY_URL_BASE}/${p.id}`;
  const subject = daysLeft(p) < 0
    ? `【至急】${EVENT_NAME} ご登録のお願い(${p.companyName}様)`
    : `【ご確認】${EVENT_NAME} ご登録のお願い(${p.companyName}様)`;
  const mailBody =
`${p.companyName}
${p.contactName} 様

いつも${EVENT_NAME}にご協力いただきありがとうございます。
${OFFICE_NAME}です。

現在、以下の項目のご登録・ご回答が確認できておりません。
お手数をおかけしますが、${fmtDate(p.deadline)}までにご対応をお願いいたします。

【未対応の項目】
${items}

【ご登録・ご回答はこちら】
${url}

ご不明な点がございましたら、下記までお気軽にお問い合わせください。

${OFFICE_NAME}
${CONTACT_INFO}`;
  const smsBody = `【${EVENT_NAME}】${p.companyName}様、${items}のご登録が未完了です。${fmtDate(p.deadline)}までにご対応をお願いします。${url}`;
  return { subject, mailBody, smsBody };
}

function buildGenericTemplate() {
  const subject = `【ご確認】${EVENT_NAME} ご登録のお願い({{会社名}}様)`;
  const mailBody =
`{{会社名}}
{{担当者名}} 様

いつも${EVENT_NAME}にご協力いただきありがとうございます。
${OFFICE_NAME}です。

現在、以下の項目のご登録・ご回答が確認できておりません。
{{回答期限}}までにご対応をお願いいたします。

【未対応の項目】
{{未対応項目}}

【ご登録・ご回答はこちら】
{{回答用URL}}

ご不明な点がございましたら、下記までお気軽にお問い合わせください。

${OFFICE_NAME}
${CONTACT_INFO}`;
  const smsBody = `【${EVENT_NAME}】{{会社名}}様、{{未対応項目}}のご登録が未完了です。{{回答期限}}までにご対応をお願いします。{{回答用URL}}`;
  return { subject, mailBody, smsBody };
}

function personalize(str, p) {
  return String(str)
    .split('{{会社名}}').join(p.companyName)
    .split('{{担当者名}}').join(p.contactName)
    .split('{{未対応項目}}').join(incompleteItemLabels(p).join('、') || 'なし')
    .split('{{回答期限}}').join(fmtDate(p.deadline))
    .split('{{回答用URL}}').join(`${ENTRY_URL_BASE}/${p.id}`);
}

/* --- SMSリマインド(第5段階) --- */
function isValidMobile(mobile) {
  return !!mobile && /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(mobile);
}

function maskMobile(mobile) {
  if (!mobile) return '未登録';
  if (mobile.length < 8) return mobile;
  const first = mobile.slice(0, 3);
  const last = mobile.slice(-4);
  return `${first}-****-${last}`;
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateSmsToken() {
  return `tok_${Math.random().toString(36).slice(2, 10)}`;
}

function findLastHistoryDate(history, companyName, channel) {
  let latest = null;
  history.forEach((h) => {
    if (h.company === companyName && h.channel === channel) {
      if (!latest || h.datetime > latest) latest = h.datetime;
    }
  });
  return latest;
}

// SMS送信候補として抽出すべき理由(1件でもあれば候補)
function computeSmsReasons(p) {
  const reasons = [];
  if (p.importantChangeUnconfirmed) reasons.push({ code: 'important', label: '重要な変更を未確認' });
  const incomplete = incompleteItemLabels(p);
  const dl = daysLeft(p);
  if ((p.mailCount || 0) > 0 && incomplete.length > 0) reasons.push({ code: 'mailedNoReply', label: 'メールで案内済みだが未回答' });
  if (dl === 1 && incomplete.length > 0) reasons.push({ code: 'd1', label: '期限前日で未完了' });
  if (dl < 0 && incomplete.length > 0) reasons.push({ code: 'over', label: '期限超過' });
  const req = REQUIRED_ITEMS_BY_TYPE[p.type];
  if (req.includes('meetingRequest') && p.items.meetingRequest !== '回答不要' && !COMPLETE_STATUSES.includes(p.items.meetingRequest)) reasons.push({ code: 'meeting', label: '面談希望未回答' });
  if (req.includes('preferredTime') && p.items.preferredTime !== '回答不要' && !COMPLETE_STATUSES.includes(p.items.preferredTime)) reasons.push({ code: 'time', label: '対応可能時間未登録' });
  if (p.type === '出展者' && p.items.productInfo !== '回答不要' && !COMPLETE_STATUSES.includes(p.items.productInfo)) reasons.push({ code: 'productInfo', label: '商品情報未登録' });
  if (p.type === '出展者' && p.items.productImage !== '回答不要' && !COMPLETE_STATUSES.includes(p.items.productImage)) reasons.push({ code: 'productImage', label: '商品画像未登録' });
  if (p.scheduleTentativePublishedDate && p.items.scheduleConfirm !== '回答不要' && !COMPLETE_STATUSES.includes(p.items.scheduleConfirm)) reasons.push({ code: 'schedule', label: '仮スケジュール未確認' });
  return reasons;
}

// SMS送信の対象外にすべき理由(1件でもあれば除外。null なら除外なし)
function computeSmsExclusionReason(p, history) {
  if (p.actionState === '参加辞退') return '参加辞退';
  if (p.actionState === '回答不要') return '回答不要';
  if (p.actionState === '個別対応中') return '個別対応中';
  if (p.actionState === '期限延長中') return '期限延長中';
  if (p.smsConsent === '未同意') return 'SMS送信に同意していない';
  if (p.smsConsent === '停止希望') return 'SMS送信停止(本人希望)';
  if (p.smsBlocked) return '管理者による送信停止';
  if (!p.mobile) return '携帯電話番号未登録';
  if (!isValidMobile(p.mobile)) return '携帯電話番号の形式が不正';
  const lastSms = findLastHistoryDate(history, p.companyName, 'SMS');
  if (lastSms) {
    const days = daysBetween(TODAY, parseDate(lastSms.slice(0, 10)));
    if (days <= SMS_RECENT_THRESHOLD_DAYS) return '一定期間内にSMS送信済み';
  }
  return null;
}

function buildSmsBody(p, url) {
  const items = incompleteItemLabels(p).join('、') || 'なし';
  return `【${OFFICE_NAME}】${p.contactName}様\n${EVENT_NAME}:${items}が未完了です。${fmtDate(p.deadline)}までに下記URLよりご回答ください。\n${url}\n${CONTACT_INFO}`;
}

function buildGenericSmsBody() {
  return `【${OFFICE_NAME}】{{担当者名}}様\n${EVENT_NAME}:{{未対応項目}}が未完了です。{{回答期限}}までに下記URLよりご回答ください。\n{{回答用URL}}\n${CONTACT_INFO}`;
}

function personalizeSms(str, p, url) {
  return String(str)
    .split('{{会社名}}').join(p.companyName)
    .split('{{担当者名}}').join(p.contactName)
    .split('{{未対応項目}}').join(incompleteItemLabels(p).join('、') || 'なし')
    .split('{{回答期限}}').join(fmtDate(p.deadline))
    .split('{{回答用URL}}').join(url);
}

function sortRows(rows, sort) {
  if (!sort.key) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    let cmp;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'ja');
    return sort.dir === 'asc' ? cmp : -cmp;
  });
  return copy;
}

function matchesPreset(p, preset) {
  if (!preset) return true;
  if (preset.type === 'complete') return calcProgress(p) === 100;
  if (preset.type === 'incomplete') return calcProgress(p) < 100;
  if (preset.type === 'overdue') return calcProgress(p) < 100 && daysLeft(p) < 0;
  if (preset.type === 'item') {
    const req = REQUIRED_ITEMS_BY_TYPE[p.type];
    if (!req.includes(preset.item)) return false;
    const st = p.items[preset.item];
    return st !== '回答不要' && !COMPLETE_STATUSES.includes(st);
  }
  if (preset.type === 'single') return p.id === preset.id;
  return true;
}

function presetLabel(preset) {
  if (!preset) return null;
  if (preset.type === 'complete') return '登録完了者のみ表示中';
  if (preset.type === 'incomplete') return '未対応者のみ表示中';
  if (preset.type === 'overdue') return '期限超過者のみ表示中';
  if (preset.type === 'item') return `「${ITEM_DEFS.find((d) => d.key === preset.item).label}」が未完了の方のみ表示中`;
  if (preset.type === 'single') return '選択した1件のみ表示中';
  return null;
}

function downloadTextFile(filename, content, mime) {
  try {
    const blob = new Blob(['\uFEFF' + content], { type: mime || 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    // 出力に失敗しても画面は継続動作させる
  }
}

function exportCSV(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((r) => columns.map((c) => `"${String(c.value(r) == null ? '' : c.value(r)).replace(/"/g, '""')}"`).join(','));
  downloadTextFile(filename, [header, ...lines].join('\n'));
}

/* --- CSVパーサー(簡易・ダブルクォート対応) --- */
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && String(r[0]).trim() === ''));
}

function buildTemplateCSV(cfg) {
  const header = cfg.fields.map((f) => f.label).join(',');
  const example = cfg.fields.map((f) => {
    if (f.type === 'email') return 'sample@example.co.jp';
    if (f.type === 'mobile') return '090-1234-5678';
    if (f.type === 'number') return '1000';
    if (f.type === 'date') return '2026-12-31';
    if (f.type === 'kubun') return cfg.fixedKubun;
    if (f.type === 'category' && f.allowed) return f.allowed[0];
    if (f.key === 'companyId') return 'EX01';
    if (f.key === 'productId') return 'P99';
    return `${f.label}例`;
  }).join(',');
  return `${header}\n${example}`;
}

function validateField(f, raw, context, seenIds) {
  const errs = [];
  if (f.required && !raw) {
    errs.push({ reason: '必須項目が未入力です', fix: `${f.label}を入力してください` });
    return errs;
  }
  if (!raw) return errs;
  if (f.maxLength && raw.length > f.maxLength) {
    errs.push({ reason: `文字数が上限(${f.maxLength}文字)を超えています(現在${raw.length}文字)`, fix: `${f.maxLength}文字以内に短縮してください` });
  }
  if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    errs.push({ reason: 'メールアドレスの形式が正しくありません', fix: '例: sample@example.co.jp の形式で入力してください' });
  }
  if (f.type === 'mobile' && !/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(raw)) {
    errs.push({ reason: '電話番号の形式が正しくありません', fix: '例: 090-1234-5678 の形式で入力してください' });
  }
  if (f.type === 'number' && !/^-?\d+(\.\d+)?$/.test(raw)) {
    errs.push({ reason: '数値として認識できません', fix: '半角数字のみで入力してください' });
  }
  if (f.type === 'date') {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !isNaN(parseDate(raw).getTime());
    if (!ok) errs.push({ reason: '日付の形式が正しくありません', fix: 'YYYY-MM-DD の形式で入力してください(例: 2026-12-31)' });
  }
  if (f.type === 'category' && f.allowed && !f.allowed.includes(raw)) {
    errs.push({ reason: `登録されていない値です(候補: ${f.allowed.join('/')})`, fix: '候補の中から選択して入力し直してください' });
  }
  if (f.type === 'kubun' && raw !== context.fixedKubun) {
    errs.push({ reason: `区分が「${context.fixedKubun}」ではありません(入力値: ${raw})`, fix: `区分に「${context.fixedKubun}」と入力してください` });
  }
  if (f.type === 'idRef' && !context.existingCompanyIds.includes(raw)) {
    errs.push({ reason: '存在しない会社IDです', fix: '先に会社情報を登録するか、正しい会社IDを入力してください' });
  }
  if (f.type === 'id' && seenIds.has(raw)) {
    errs.push({ reason: 'このCSV内でIDが重複しています', fix: 'IDを一意の値に修正してください' });
  }
  return errs;
}

function runValidation(fields, dataRows, mapping, context) {
  const seenIds = new Set();
  return dataRows.map((rowValues, idx) => {
    const rowNumber = idx + 2;
    const data = {};
    const errors = [];
    fields.forEach((f) => {
      const colIdx = mapping[f.key];
      const raw = (colIdx != null && colIdx >= 0 && rowValues[colIdx] != null) ? String(rowValues[colIdx]).trim() : '';
      data[f.key] = raw;
      const fieldErrors = validateField(f, raw, context, seenIds);
      fieldErrors.forEach((fe) => errors.push({ row: rowNumber, field: f.label, reason: fe.reason, fix: fe.fix }));
      if (f.type === 'id' && raw && !fieldErrors.some((e) => e.reason.includes('重複'))) seenIds.add(raw);
    });
    return { rowNumber, data, errors };
  });
}

/* --- 商品画像 --- */
function makePlaceholderImage(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="#E2E8F0"/><text x="50%" y="50%" font-size="14" text-anchor="middle" fill="#64748B" dy=".3em">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const PLACEHOLDER_IMG = makePlaceholderImage('サンプル画像');

function getProductImageState(productImages, productId) {
  return productImages[productId] || { main: null, subs: [null, null, null, null], package: null, usage: null };
}
function isImageComplete(productImages, productId) {
  return !!getProductImageState(productImages, productId).main;
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* --- マッチングエンジン --- */
function regionOf(address) {
  if (!address) return null;
  const hit = REGION_KEYWORDS.find((r) => r.match.some((k) => address.includes(k)));
  return hit ? hit.region : null;
}

function timeRangeOf(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) };
}
function timeOverlaps(a, b) {
  const ra = timeRangeOf(a);
  const rb = timeRangeOf(b);
  if (!ra || !rb) return null;
  return ra.start < rb.end && rb.start < ra.end;
}

function rankLabel(rank) { return `第${rank}希望`; }

function emptyMeetingRequest(type) {
  return type === '出展者'
    ? { wishes: [], unavailable: [], notes: '' }
    : { wishes: [], unavailable: [], interestCategories: [], notes: '' };
}

function generateCandidates(participants, products, meetingRequests, manualPairs) {
  const exhibitors = participants.filter((p) => p.type === '出展者' && p.actionState !== '参加辞退');
  const buyers = participants.filter((p) => p.type === 'バイヤー' && p.actionState !== '参加辞退');
  const manualMap = new Map(manualPairs.map((m) => [`${m.exhibitorId}_${m.buyerId}`, m]));
  const candidates = [];

  exhibitors.forEach((ex) => {
    const exMR = meetingRequests[ex.id] || emptyMeetingRequest('出展者');
    const exProducts = products.filter((pr) => pr.companyId === ex.id);
    buyers.forEach((by) => {
      const byMR = meetingRequests[by.id] || emptyMeetingRequest('バイヤー');
      const exWish = (exMR.wishes || []).find((w) => w.buyerId === by.id);
      const byWish = (byMR.wishes || []).find((w) => w.exhibitorId === ex.id);
      const exUnavailable = (exMR.unavailable || []).includes(by.id);
      const byUnavailable = (byMR.unavailable || []).includes(ex.id);
      const categoryMatch = !!((byMR.interestCategories || []).includes(ex.category)) || !!(by.desiredCategory && by.desiredCategory.includes(ex.category));
      const mutual = !!(exWish && byWish);
      const manual = manualMap.get(`${ex.id}_${by.id}`);

      if (!mutual && !exWish && !byWish && !categoryMatch && !manual) return;

      const factors = [];
      let category;
      if (mutual) {
        category = '相互希望';
        factors.push({ label: `相互に面談を希望(出展者:${rankLabel(exWish.rank)} / バイヤー:${rankLabel(byWish.rank)})`, points: 40 });
      } else if (byWish) {
        category = 'バイヤー希望';
        if (byWish.rank === 1) factors.push({ label: 'バイヤーが第1希望にしている', points: 30 });
        else factors.push({ label: `バイヤーが${rankLabel(byWish.rank)}にしている`, points: 20 });
      } else if (exWish) {
        category = '出展者希望';
        factors.push({ label: '出展者が希望している', points: 15 });
      } else {
        category = 'システム推奨';
      }

      if (categoryMatch) factors.push({ label: `商品カテゴリー(${ex.category})がバイヤーの関心と一致`, points: 15 });
      const channelKeyword = BUSINESS_CHANNEL_MAP[by.businessType];
      const channelMatch = !!(channelKeyword && exProducts.some((pr) => pr.channel && pr.channel.includes(channelKeyword)));
      if (channelMatch) factors.push({ label: `販売チャネルが一致(${by.businessType}向け)`, points: 10 });
      const buyerRegion = regionOf(by.address);
      const areaMatch = exProducts.some((pr) => pr.area === '全国' || (buyerRegion && pr.area && pr.area.includes(buyerRegion)));
      if (areaMatch) factors.push({ label: `商圏が一致(${buyerRegion || '全国'}対応)`, points: 5 });
      if (factors.length === 0 && manual) factors.push({ label: '担当者による手動追加', points: 0 });

      let score = Math.min(factors.reduce((s, f) => s + f.points, 0), 100);

      const cautions = [];
      const overlap = timeOverlaps(ex.availableTime, by.visitTime);
      if (overlap === false) cautions.push('双方の対応可能時間が重ならない可能性があります(要確認)');

      if (exUnavailable || byUnavailable) {
        category = '対応不可';
        cautions.unshift(byUnavailable ? 'バイヤー側がこの出展者を対応不可に設定しています' : '出展者側がこのバイヤーを対応不可に設定しています');
      }

      const fallbackProduct = exProducts.find((pr) => pr.category === ex.category) || exProducts[0] || null;
      const productId = (manual && manual.productId) || (exWish && exWish.productId) || (byWish && byWish.productId) || (fallbackProduct ? fallbackProduct.id : null);

      candidates.push({
        id: `${ex.id}_${by.id}`,
        exhibitorId: ex.id,
        buyerId: by.id,
        productId,
        category,
        score,
        factors,
        exhibitorRank: exWish ? exWish.rank : null,
        buyerRank: byWish ? byWish.rank : null,
        timeOverlap: overlap,
        cautions,
      });
    });
  });

  return candidates;
}

/* --- タイムスケジュール調整 --- */
function toMin(hhmm) {
  const parts = String(hhmm).split(':');
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}
function toHHMM(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timesOverlap(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }

function generateTimeSlots(settings) {
  const start = toMin(settings.startTime);
  const end = toMin(settings.endTime);
  const breakStart = settings.breakStart ? toMin(settings.breakStart) : null;
  const breakEnd = settings.breakEnd ? toMin(settings.breakEnd) : null;
  const step = settings.meetingDuration + settings.changeoverDuration;
  const slots = [];
  let cursor = start;
  let index = 0;
  let segment = 0;
  let guard = 0;
  while (cursor + settings.meetingDuration <= end && guard < 500) {
    guard++;
    const slotStart = cursor;
    const slotEnd = cursor + settings.meetingDuration;
    const overlapsBreak = breakStart != null && slotStart < breakEnd && breakStart < slotEnd;
    if (overlapsBreak) { cursor = breakEnd; segment++; continue; }
    slots.push({ index, start: toHHMM(slotStart), end: toHHMM(slotEnd), startMin: slotStart, endMin: slotEnd, segment });
    index++;
    cursor += step;
  }
  return slots;
}

function consecutiveRunAt(usedIndices, slots, targetIndex) {
  const slotMap = new Map(slots.map((s) => [s.index, s]));
  const targetSlot = slotMap.get(targetIndex);
  if (!targetSlot) return 1;
  let run = 1;
  let i = targetIndex - 1;
  while (usedIndices.has(i)) {
    const s = slotMap.get(i);
    if (!s || s.segment !== targetSlot.segment) break;
    run++; i--;
  }
  let j = targetIndex + 1;
  while (usedIndices.has(j)) {
    const s = slotMap.get(j);
    if (!s || s.segment !== targetSlot.segment) break;
    run++; j++;
  }
  return run;
}

const MATCH_PRIORITY_RANK = { '相互希望': 0, 'バイヤー希望': 1, '出展者希望': 2, 'システム推奨': 3, '対応不可': 4 };

function autoSchedule(approvedCandidates, participants, settings) {
  const slots = generateTimeSlots(settings);
  const tableIds = Array.from({ length: settings.tableCount }, (_, i) => i + 1);

  const sorted = [...approvedCandidates].sort((a, b) => {
    const pr = MATCH_PRIORITY_RANK[a.category] - MATCH_PRIORITY_RANK[b.category];
    if (pr !== 0) return pr;
    if (a.buyerRank && b.buyerRank && a.buyerRank !== b.buyerRank) return a.buyerRank - b.buyerRank;
    return b.score - a.score;
  });

  const buyerSlots = {};
  const exhibitorSlots = {};
  const tableSlots = {};
  const buyerCount = {};
  const exhibitorCount = {};
  const placed = [];
  const unplaced = [];

  sorted.forEach((cand) => {
    const buyer = participants.find((p) => p.id === cand.buyerId);
    const exhibitor = participants.find((p) => p.id === cand.exhibitorId);
    if (!buyer || !exhibitor) { unplaced.push({ ...cand, reason: '対象の会社情報が見つかりません' }); return; }
    if (!buyerSlots[cand.buyerId]) buyerSlots[cand.buyerId] = new Set();
    if (!exhibitorSlots[cand.exhibitorId]) exhibitorSlots[cand.exhibitorId] = new Set();

    if ((buyerCount[cand.buyerId] || 0) >= settings.maxMeetingsPerBuyer) { unplaced.push({ ...cand, reason: 'バイヤーの面談数上限に達しています' }); return; }
    if ((exhibitorCount[cand.exhibitorId] || 0) >= settings.maxMeetingsPerExhibitor) { unplaced.push({ ...cand, reason: '出展者の面談数上限に達しています' }); return; }

    const buyerWindow = timeRangeOf(buyer.visitTime);
    const exWindow = timeRangeOf(exhibitor.availableTime);

    let assignedSlot = null, assignedTable = null;
    for (const slot of slots) {
      if (buyerSlots[cand.buyerId].has(slot.index)) continue;
      if (exhibitorSlots[cand.exhibitorId].has(slot.index)) continue;
      if (buyerWindow && (slot.startMin < buyerWindow.start || slot.endMin > buyerWindow.end)) continue;
      if (exWindow && (slot.startMin < exWindow.start || slot.endMin > exWindow.end)) continue;
      const buyerRunIfPlaced = consecutiveRunAt(buyerSlots[cand.buyerId], slots, slot.index);
      if (buyerRunIfPlaced > settings.maxConsecutiveMeetings) continue;
      const exRunIfPlaced = consecutiveRunAt(exhibitorSlots[cand.exhibitorId], slots, slot.index);
      if (exRunIfPlaced > settings.maxConsecutiveMeetings) continue;
      const usedTables = tableSlots[slot.index] || new Set();
      const freeTable = tableIds.find((t) => !usedTables.has(t));
      if (freeTable == null) continue;
      assignedSlot = slot; assignedTable = freeTable;
      break;
    }

    if (!assignedSlot) { unplaced.push({ ...cand, reason: '条件を満たす空き枠が見つかりませんでした' }); return; }

    buyerSlots[cand.buyerId].add(assignedSlot.index);
    exhibitorSlots[cand.exhibitorId].add(assignedSlot.index);
    if (!tableSlots[assignedSlot.index]) tableSlots[assignedSlot.index] = new Set();
    tableSlots[assignedSlot.index].add(assignedTable);
    buyerCount[cand.buyerId] = (buyerCount[cand.buyerId] || 0) + 1;
    exhibitorCount[cand.exhibitorId] = (exhibitorCount[cand.exhibitorId] || 0) + 1;

    placed.push({
      id: `sch_${cand.id}`,
      candidateId: cand.id,
      exhibitorId: cand.exhibitorId,
      buyerId: cand.buyerId,
      productId: cand.productId,
      category: cand.category,
      score: cand.score,
      exhibitorRank: cand.exhibitorRank,
      buyerRank: cand.buyerRank,
      slotIndex: assignedSlot.index,
      start: assignedSlot.start,
      end: assignedSlot.end,
      table: assignedTable,
      status: '作成中',
    });
  });

  return { placed, unplaced, slots };
}

function computeScheduleWarnings(item, allItems, participants, meetingRequests, settings, candidateMeta, slots) {
  const warnings = [];
  const buyer = participants.find((p) => p.id === item.buyerId);
  const exhibitor = participants.find((p) => p.id === item.exhibitorId);
  const others = allItems.filter((it) => it.id !== item.id);

  others.forEach((o) => {
    const overlap = timesOverlap(item.start, item.end, o.start, o.end);
    if (!overlap) return;
    if (o.buyerId === item.buyerId) warnings.push('同じバイヤーの時間が重複しています');
    if (o.exhibitorId === item.exhibitorId) warnings.push('同じ出展者の時間が重複しています');
    if (o.table === item.table) warnings.push('テーブル番号が重複しています');
  });

  if (buyer) {
    const r = timeRangeOf(buyer.visitTime);
    if (r && (toMin(item.start) < r.start || toMin(item.end) > r.end)) warnings.push('バイヤーの対応可能時間外です');
  }
  if (exhibitor) {
    const r = timeRangeOf(exhibitor.availableTime);
    if (r && (toMin(item.start) < r.start || toMin(item.end) > r.end)) warnings.push('出展者の対応可能時間外です');
  }

  const exMR = meetingRequests[item.exhibitorId];
  const byMR = meetingRequests[item.buyerId];
  if ((exMR && exMR.unavailable || []).includes(item.buyerId) || (byMR && byMR.unavailable || []).includes(item.exhibitorId)) {
    warnings.push('対応不可に設定された組み合わせです');
  }

  const buyerCount = allItems.filter((it) => it.buyerId === item.buyerId).length;
  const exCount = allItems.filter((it) => it.exhibitorId === item.exhibitorId).length;
  if (buyerCount > settings.maxMeetingsPerBuyer) warnings.push('バイヤーの面談数上限を超えています');
  if (exCount > settings.maxMeetingsPerExhibitor) warnings.push('出展者の面談数上限を超えています');

  const buyerUsed = new Set(allItems.filter((it) => it.buyerId === item.buyerId).map((it) => it.slotIndex));
  const exUsed = new Set(allItems.filter((it) => it.exhibitorId === item.exhibitorId).map((it) => it.slotIndex));
  if (consecutiveRunAt(buyerUsed, slots, item.slotIndex) > settings.maxConsecutiveMeetings) warnings.push('バイヤーの連続面談数が上限を超えています');
  if (consecutiveRunAt(exUsed, slots, item.slotIndex) > settings.maxConsecutiveMeetings) warnings.push('出展者の連続面談数が上限を超えています');

  if (settings.breakStart && settings.breakEnd && timesOverlap(item.start, item.end, settings.breakStart, settings.breakEnd)) {
    warnings.push('休憩時間帯に重なっています');
  }

  const candStatus = item.candidateId ? ((candidateMeta[item.candidateId] && candidateMeta[item.candidateId].status) || '保留') : null;
  if (!item.candidateId || candStatus !== '採用') warnings.push('元となるマッチングが「採用」として確定していません');

  return warnings;
}

/* =========================================================================
   サンプルデータ
   ========================================================================= */

const INITIAL_PARTICIPANTS = [
  {
    id: 'EX01', type: '出展者', companyName: '北海道大地フーズ株式会社', companyNameKana: 'ホッカイドウダイチフーズ',
    contactName: '山田太郎', email: 'yamada@hokkaido-daichi.example.co.jp', mobile: '090-1234-5601',
    postalCode: '060-0001', address: '北海道札幌市中央区北一条西1-1', phone: '011-200-1001',
    website: 'https://hokkaido-daichi.example.co.jp', industry: '農産加工品',
    introduction: '北海道産の野菜を中心とした加工食品を製造。安心・安全にこだわった商品づくりが強み。',
    referral: '前回大会からの継続出展', department: '営業部', note: '', companyStatus: '本登録',
    category: '農産加工品', boothNumber: 'A-01', availableTime: '10:00〜16:00', lastUpdated: '2026-06-20', productCount: 2,
    items: { basicInfo: '確認済み', productInfo: '確認済み', productImage: '提出済み', meetingRequest: '確認済み', preferredTime: '確認済み', scheduleConfirm: '確認済み' },
    deadline: '2026-06-25', lastContactDate: '2026-06-20', assignedStaff: '中野', mailCount: 2, smsCount: 0,
    actionState: '送信済み', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-06-15',
    memos: [{ date: '2026-06-18', staff: '中野', text: '初回案内メール送信済み' }],
  },
  {
    id: 'EX02', type: '出展者', companyName: '瀬戸内オリーブ食品株式会社', companyNameKana: 'セトウチオリーブショクヒン',
    contactName: '佐藤花子', email: 'sato@setouchi-olive.example.co.jp', mobile: '090-1234-5602',
    postalCode: '730-0001', address: '広島県広島市中区基町1-1', phone: '082-200-1002',
    website: 'https://setouchi-olive.example.co.jp', industry: '調味料・油',
    introduction: '瀬戸内産オリーブを使用した油・調味料を製造。',
    referral: '公式Webサイトからの申込', department: '商品部', note: '', companyStatus: '仮登録',
    category: '調味料・油', boothNumber: 'A-02', availableTime: '未回答', lastUpdated: '2026-06-10', productCount: 2,
    items: { basicInfo: '提出済み', productInfo: '入力中', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-12', lastContactDate: null, assignedStaff: '岡田', mailCount: 0, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: null, memos: [],
  },
  {
    id: 'EX03', type: '出展者', companyName: '九州うまか水産株式会社', companyNameKana: 'キュウシュウウマカスイサン',
    contactName: '鈴木一郎', email: 'suzuki@kyushu-umaka.example.co.jp', mobile: '090-1234-5603',
    postalCode: '810-0001', address: '福岡県福岡市中央区天神1-1', phone: '092-200-1003',
    website: 'https://kyushu-umaka.example.co.jp', industry: '水産加工品',
    introduction: '九州近海で獲れた魚介類を使用した加工品を製造。',
    referral: '前回大会からの継続出展', department: '営業部', note: '', companyStatus: '本登録',
    category: '水産加工品', boothNumber: 'A-03', availableTime: '9:00〜17:00', lastUpdated: '2026-06-28', productCount: 2,
    items: { basicInfo: '確認済み', productInfo: '確認済み', productImage: '提出済み', meetingRequest: '確認済み', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-08', lastContactDate: '2026-06-25', assignedStaff: '石井', mailCount: 1, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01', memos: [],
  },
  {
    id: 'EX04', type: '出展者', companyName: '信州発酵食品工房', companyNameKana: 'シンシュウハッコウショクヒンコウボウ',
    contactName: '田中健二', email: 'tanaka@shinshu-hakko.example.co.jp', mobile: '090-1234-5604',
    postalCode: '380-0001', address: '長野県長野市南長野1-1', phone: '026-200-1004',
    website: 'https://shinshu-hakko.example.co.jp', industry: '発酵食品',
    introduction: '信州の気候を活かした味噌・甘酒を製造する老舗工房。',
    referral: '取引先からの紹介', department: '製造部', note: '基本情報に一部不備があり確認中', companyStatus: '仮登録',
    category: '発酵食品', boothNumber: 'A-04', availableTime: '10:00〜15:00', lastUpdated: '2026-07-01', productCount: 2,
    items: { basicInfo: '修正依頼中', productInfo: '提出済み', productImage: '提出済み', meetingRequest: '提出済み', preferredTime: '提出済み', scheduleConfirm: '未着手' },
    deadline: '2026-07-15', lastContactDate: '2026-07-02', assignedStaff: '藤井', mailCount: 1, smsCount: 1,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: '2026-07-02', scheduleTentativePublishedDate: null,
    memos: [{ date: '2026-07-02', staff: '藤井', text: '基本情報に不備があり修正依頼を送付' }],
  },
  {
    id: 'EX05', type: '出展者', companyName: '大和スイーツ製菓株式会社', companyNameKana: 'ヤマトスイーツセイカ',
    contactName: '伊藤さくら', email: 'ito@yamato-sweets.example.co.jp', mobile: '090-1234-5605',
    postalCode: '630-0001', address: '奈良県奈良市登大路町1-1', phone: '0742-20-1005',
    website: 'https://yamato-sweets.example.co.jp', industry: '菓子',
    introduction: '奈良の特産品を使った和洋菓子を製造。',
    referral: '公式Webサイトからの申込', department: '営業部', note: '', companyStatus: '仮登録',
    category: '菓子', boothNumber: 'A-05', availableTime: '未回答', lastUpdated: '2026-06-05', productCount: 2,
    items: { basicInfo: '未着手', productInfo: '未着手', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-06', lastContactDate: null, assignedStaff: '中野', mailCount: 0, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01', memos: [],
  },
  {
    id: 'EX06', type: '出展者', companyName: '東北銘茶株式会社', companyNameKana: 'トウホクメイチャ',
    contactName: '渡辺隆', email: 'watanabe@tohoku-meicha.example.co.jp', mobile: '090-1234-5606',
    postalCode: '980-0001', address: '宮城県仙台市青葉区国分町1-1', phone: '022-200-1006',
    website: 'https://tohoku-meicha.example.co.jp', industry: '飲料・茶',
    introduction: '東北産茶葉を使用したお茶を製造・販売。',
    referral: '紹介元不明', department: '営業部', note: '連絡がつきにくい傾向あり', companyStatus: '仮登録',
    category: '飲料・茶', boothNumber: 'A-06', availableTime: '未回答', lastUpdated: '2026-06-01', productCount: 2,
    items: { basicInfo: '未着手', productInfo: '未着手', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-06-30', lastContactDate: '2026-06-15', assignedStaff: '岡田', mailCount: 2, smsCount: 1,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01',
    memos: [{ date: '2026-06-15', staff: '岡田', text: '電話するも不在。再度連絡予定' }],
  },
  {
    id: 'EX07', type: '出展者', companyName: '京都七味と乾物本舗', companyNameKana: 'キョウトシチミトカンブツホンポ',
    contactName: '中村由美', email: 'nakamura@kyoto-shichimi.example.co.jp', mobile: '090-1234-5607',
    postalCode: '600-0001', address: '京都府京都市下京区四条通1-1', phone: '075-200-1007',
    website: 'https://kyoto-shichimi.example.co.jp', industry: '乾物・香辛料',
    introduction: '京都の老舗が手掛ける七味・乾物の専門店。',
    referral: '前回大会からの継続出展', department: '営業部', note: '', companyStatus: '本登録',
    category: '乾物・香辛料', boothNumber: 'A-07', availableTime: '未回答', lastUpdated: '2026-06-22', productCount: 2,
    items: { basicInfo: '提出済み', productInfo: '未着手', productImage: '未着手', meetingRequest: '提出済み', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-20', lastContactDate: '2026-06-22', assignedStaff: '石井', mailCount: 1, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: null, memos: [],
  },
  {
    id: 'EX08', type: '出展者', companyName: '湘南ベーカリー株式会社', companyNameKana: 'ショウナンベーカリー',
    contactName: '小林正人', email: 'kobayashi@shonan-bakery.example.co.jp', mobile: '090-1234-5608',
    postalCode: '251-0001', address: '神奈川県藤沢市藤沢1-1', phone: '0466-20-1008',
    website: 'https://shonan-bakery.example.co.jp', industry: 'パン・洋菓子',
    introduction: '湘南地域の食材を使ったパン・焼菓子を製造。',
    referral: '公式Webサイトからの申込', department: '製造部', note: '担当者が長期出張中', companyStatus: '仮登録',
    category: 'パン・洋菓子', boothNumber: 'A-08', availableTime: '未回答', lastUpdated: '2026-06-18', productCount: 2,
    items: { basicInfo: '提出済み', productInfo: '入力中', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-03', lastContactDate: '2026-06-28', assignedStaff: '藤井', mailCount: 2, smsCount: 0,
    actionState: '個別対応中', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: null,
    memos: [{ date: '2026-06-28', staff: '藤井', text: '担当者が長期出張のため個別に対応日程を調整中' }],
  },
  {
    id: 'EX09', type: '出展者', companyName: '沖縄トロピカルフルーツ加工', companyNameKana: 'オキナワトロピカルフルーツカコウ',
    contactName: '加藤愛', email: 'kato@okinawa-tropical.example.co.jp', mobile: '090-1234-5609',
    postalCode: '900-0001', address: '沖縄県那覇市泉崎1-1', phone: '098-200-1009',
    website: 'https://okinawa-tropical.example.co.jp', industry: '果実加工品',
    introduction: '沖縄産トロピカルフルーツを使用したジャム・果汁を製造。',
    referral: '取引先からの紹介', department: '営業部', note: '期限延長を検討中', companyStatus: '仮登録',
    category: '果実加工品', boothNumber: 'A-09', availableTime: '未回答', lastUpdated: '2026-06-30', productCount: 2,
    items: { basicInfo: '提出済み', productInfo: '未着手', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-08', lastContactDate: '2026-06-30', assignedStaff: '中野', mailCount: 1, smsCount: 0,
    actionState: '期限延長中', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: null,
    memos: [{ date: '2026-06-30', staff: '中野', text: '出展者都合により期限延長を検討中。正式な新期限は未確定のため一旦リマインド対象から除外' }],
  },
  {
    id: 'EX10', type: '出展者', companyName: '奥飛騨手打ち麺工房', companyNameKana: 'オクヒダテウチメンコウボウ',
    contactName: '吉田健太', email: 'yoshida@okuhida-men.example.co.jp', mobile: '090-1234-5610',
    postalCode: '506-0001', address: '岐阜県高山市天満町1-1', phone: '0577-20-1010',
    website: 'https://okuhida-men.example.co.jp', industry: '麺類',
    introduction: '奥飛騨の伝統製法で作る手打ち麺の専門工房。',
    referral: '前回大会からの継続出展', department: '営業部', note: '', companyStatus: '本登録',
    category: '麺類', boothNumber: 'A-10', availableTime: '10:00〜16:00', lastUpdated: '2026-07-01', productCount: 2,
    items: { basicInfo: '確認済み', productInfo: '確認済み', productImage: '提出済み', meetingRequest: '確認済み', preferredTime: '確認済み', scheduleConfirm: '未着手' },
    deadline: '2026-07-01', lastContactDate: '2026-06-29', assignedStaff: '岡田', mailCount: 1, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01', memos: [],
  },
  {
    id: 'BY01', type: 'バイヤー', companyName: '株式会社マルフク商事', companyNameKana: 'マルフクショウジ',
    contactName: '山本恵子', email: 'yamamoto@marufuku-shoji.example.co.jp', mobile: '080-2234-5601',
    postalCode: '103-0001', address: '東京都中央区日本橋1-1', phone: '03-3200-2001',
    website: 'https://marufuku-shoji.example.co.jp', industry: '卸売',
    introduction: '食品全般を扱う卸売商社。',
    referral: '前回大会からの継続来場', department: '仕入部', note: '', companyStatus: '本登録',
    businessType: '卸売', desiredCategory: '農産加工品・発酵食品', visitTime: '10:00〜12:00', desiredRank: '第1希望', lastUpdated: '2026-06-20',
    items: { basicInfo: '確認済み', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '確認済み', preferredTime: '確認済み', scheduleConfirm: '確認済み' },
    deadline: '2026-06-28', lastContactDate: '2026-06-18', assignedStaff: '中野', mailCount: 1, smsCount: 0,
    actionState: '送信済み', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-06-20', memos: [],
  },
  {
    id: 'BY02', type: 'バイヤー', companyName: 'セントラルグローサリー株式会社', companyNameKana: 'セントラルグローサリー',
    contactName: '松本大輔', email: 'matsumoto@central-grocery.example.co.jp', mobile: '080-2234-5602',
    postalCode: '150-0001', address: '東京都渋谷区神宮前1-1', phone: '03-3200-2002',
    website: 'https://central-grocery.example.co.jp', industry: 'スーパーマーケット',
    introduction: '首都圏で食品スーパーを展開。',
    referral: '公式Webサイトからの申込', department: '商品部', note: '', companyStatus: '仮登録',
    businessType: 'スーパーマーケット', desiredCategory: '菓子・飲料', visitTime: '未回答', desiredRank: '第2希望', lastUpdated: '2026-06-15',
    items: { basicInfo: '提出済み', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '提出済み', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-08', lastContactDate: null, assignedStaff: '岡田', mailCount: 0, smsCount: 0,
    actionState: '未対応', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01', memos: [],
  },
  {
    id: 'BY03', type: 'バイヤー', companyName: '株式会社フードサービス両国', companyNameKana: 'フードサービスリョウゴク',
    contactName: '井上智子', email: 'inoue@foodservice-ryogoku.example.co.jp', mobile: '080-2234-5603',
    postalCode: '130-0001', address: '東京都墨田区両国1-1', phone: '03-3200-2003',
    website: 'https://foodservice-ryogoku.example.co.jp', industry: '外食チェーン',
    introduction: '和食を中心とした外食チェーンを展開。',
    referral: '紹介元不明', department: '仕入部', note: '連絡が取れずリマインド停止中', companyStatus: '仮登録',
    businessType: '外食チェーン', desiredCategory: '水産加工品', visitTime: '未回答', desiredRank: '第1希望', lastUpdated: '2026-06-10',
    items: { basicInfo: '未着手', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-01', lastContactDate: '2026-06-20', assignedStaff: '石井', mailCount: 3, smsCount: 1,
    actionState: 'リマインド停止', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: '2026-07-01',
    memos: [{ date: '2026-06-25', staff: '石井', text: '複数回連絡するも返信なし。上長判断でリマインド停止' }],
  },
  {
    id: 'BY04', type: 'バイヤー', companyName: 'たべもの百貨店株式会社', companyNameKana: 'タベモノヒャッカテン',
    contactName: '木村誠', email: 'kimura@tabemono-depart.example.co.jp', mobile: '080-2234-5604',
    postalCode: '460-0001', address: '愛知県名古屋市中区栄1-1', phone: '052-200-2004',
    website: 'https://tabemono-depart.example.co.jp', industry: '百貨店',
    introduction: '中部地方で百貨店を展開、食品催事にも力を入れる。',
    referral: '前回大会からの継続来場', department: '催事担当', note: '', companyStatus: '本登録',
    businessType: '百貨店', desiredCategory: '菓子・パン', visitTime: '13:00〜15:00', desiredRank: '第3希望', lastUpdated: '2026-07-04',
    items: { basicInfo: '提出済み', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '提出済み', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-04', lastContactDate: '2026-07-04', assignedStaff: '藤井', mailCount: 2, smsCount: 0,
    actionState: '未対応', nextActionDate: '2026-07-10', modifiedRequestDate: null, scheduleTentativePublishedDate: null,
    memos: [{ date: '2026-07-04', staff: '藤井', text: '本日電話で状況確認。今週中に対応いただける予定' }],
  },
  {
    id: 'BY05', type: 'バイヤー', companyName: '株式会社ウェルネスマート', companyNameKana: 'ウェルネスマート',
    contactName: '高橋美咲', email: 'takahashi@wellness-mart.example.co.jp', mobile: '080-2234-5605',
    postalCode: '060-0002', address: '北海道札幌市中央区大通1-1', phone: '011-200-2005',
    website: 'https://wellness-mart.example.co.jp', industry: '自然食品専門店',
    introduction: 'オーガニック・自然食品を専門に取り扱う。',
    referral: '公式Webサイトからの申込', department: '商品部', note: '今回は不参加', companyStatus: '保留',
    businessType: '自然食品専門店', desiredCategory: '発酵食品・果実加工品', visitTime: '未回答', desiredRank: '第2希望', lastUpdated: '2026-06-12',
    items: { basicInfo: '未着手', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
    deadline: '2026-07-08', lastContactDate: '2026-06-12', assignedStaff: '中野', mailCount: 1, smsCount: 0,
    actionState: '参加辞退', nextActionDate: null, modifiedRequestDate: null, scheduleTentativePublishedDate: null,
    memos: [{ date: '2026-06-12', staff: '中野', text: '今回は都合により不参加とのご連絡あり' }],
  },
];

// 第5段階(SMSリマインド)の項目を既定値で補い、デモ用に一部の会社だけ例外値を設定します。
const SMS_FIELD_OVERRIDES = {
  EX02: { mobile: '' }, // 携帯電話番号未登録のデモ
  EX05: { smsConsent: '未同意' }, // SMS送信に同意していないデモ
  EX07: { importantChangeUnconfirmed: true }, // 重要な変更未確認のデモ
  EX10: { smsConsent: '停止希望' }, // SMS送信停止(本人希望)のデモ
  BY03: { mobile: '080-22-11' }, // 携帯電話番号の形式が不正なデモ
  BY04: { smsBlocked: true }, // 管理者による送信停止のデモ
};
INITIAL_PARTICIPANTS.forEach((p) => {
  if (p.smsConsent === undefined) p.smsConsent = '同意';
  if (p.smsBlocked === undefined) p.smsBlocked = false;
  if (p.importantChangeUnconfirmed === undefined) p.importantChangeUnconfirmed = false;
  if (SMS_FIELD_OVERRIDES[p.id]) Object.assign(p, SMS_FIELD_OVERRIDES[p.id]);
});

const INITIAL_PRODUCTS = [
  { id: 'P01', companyId: 'EX01', productName: '北海道産とうもろこしピューレ', category: '農産加工品', subCategory: '野菜ピューレ', description: '北海道産とうもろこしを丸ごとピューレにした無添加商品。', features: '無添加・北海道産100%', targetCustomer: '高級スーパー・レストラン', desiredBuyer: '百貨店・自然食品専門店', channel: '卸売・直販', retailPrice: '680', wholesalePrice: '420', minOrderQty: '50', area: '全国', temperatureZone: '冷凍', expiry: '2027-06-30', certification: 'なし', allergen: 'なし', jan: '4901234500001', pitch: 'そのままスープや離乳食に使える手軽さが好評です。' },
  { id: 'P02', companyId: 'EX01', productName: '大地の恵み じゃがいもフレーク', category: '農産加工品', subCategory: '乾燥野菜', description: '北海道産じゃがいもを使用した乾燥フレーク。', features: '長期保存可能・お湯で戻すだけ', targetCustomer: '給食・介護施設', desiredBuyer: '卸売・外食チェーン', channel: '卸売', retailPrice: '450', wholesalePrice: '280', minOrderQty: '100', area: '全国', temperatureZone: '常温', expiry: '2027-12-31', certification: 'なし', allergen: 'なし', jan: '4901234500002', pitch: 'マッシュポテトや離乳食にすぐ使える手軽さが強みです。' },
  { id: 'P03', companyId: 'EX02', productName: '瀬戸内レモンオリーブオイル', category: '調味料・油', subCategory: 'フレーバーオイル', description: '瀬戸内産レモンを使用した香り高いオリーブオイル。', features: 'レモンの爽やかな香り', targetCustomer: 'レストラン・カフェ', desiredBuyer: '百貨店・スーパーマーケット', channel: '卸売・直販', retailPrice: '1200', wholesalePrice: '780', minOrderQty: '30', area: '全国', temperatureZone: '常温', expiry: '2027-03-31', certification: 'なし', allergen: 'なし', jan: '4901234500003', pitch: 'サラダやパスタの仕上げに使える上質な一本です。' },
  { id: 'P04', companyId: 'EX02', productName: '瀬戸内藻塩ドレッシング', category: '調味料・油', subCategory: 'ドレッシング', description: '瀬戸内産の藻塩を使用したまろやかなドレッシング。', features: '藻塩の旨味', targetCustomer: 'スーパー・惣菜店', desiredBuyer: 'スーパーマーケット', channel: '卸売', retailPrice: '580', wholesalePrice: '350', minOrderQty: '50', area: '全国', temperatureZone: '常温', expiry: '2027-01-31', certification: 'なし', allergen: '大豆', jan: '4901234500004', pitch: '素材の味を活かすまろやかな塩味が人気です。' },
  { id: 'P05', companyId: 'EX03', productName: '九州産さば味噌煮缶詰', category: '水産加工品', subCategory: '缶詰', description: '九州近海で獲れたさばを使用した味噌煮缶詰。', features: '骨まで柔らかく調理', targetCustomer: 'スーパー・防災備蓄', desiredBuyer: 'スーパーマーケット・卸売', channel: '卸売', retailPrice: '320', wholesalePrice: '190', minOrderQty: '100', area: '全国', temperatureZone: '常温', expiry: '2028-06-30', certification: 'なし', allergen: '大豆・さば', jan: '4901234500005', pitch: '備蓄食としても人気の定番商品です。' },
  { id: 'P06', companyId: 'EX03', productName: '天然だし炙りあごちくわ', category: '水産加工品', subCategory: '練り物', description: 'あご(飛魚)を使用した香ばしいちくわ。', features: '炙り焼きで香ばしい', targetCustomer: '百貨店・高級スーパー', desiredBuyer: '百貨店', channel: '卸売・直販', retailPrice: '780', wholesalePrice: '480', minOrderQty: '30', area: '九州・関西', temperatureZone: '冷蔵', expiry: '2026-12-31', certification: 'なし', allergen: '小麦', jan: '4901234500006', pitch: 'おでんやおつまみに最適な逸品です。' },
  { id: 'P07', companyId: 'EX04', productName: '信州手作り味噌(米味噌)', category: '発酵食品', subCategory: '味噌', description: '信州の気候で熟成させた手作り米味噌。', features: '天然醸造・無添加', targetCustomer: '自然食品専門店・百貨店', desiredBuyer: '自然食品専門店', channel: '卸売・直販', retailPrice: '890', wholesalePrice: '560', minOrderQty: '30', area: '全国', temperatureZone: '常温', expiry: '2027-09-30', certification: '有機JAS', allergen: '大豆', jan: '4901234500007', pitch: '天然醸造ならではの深いコクが自慢です。' },
  { id: 'P08', companyId: 'EX04', productName: '信州あまざけ(飲む点滴)', category: '発酵食品', subCategory: '甘酒', description: '米麹のみで作った砂糖不使用のあまざけ。', features: '砂糖不使用・ノンアルコール', targetCustomer: '健康志向層', desiredBuyer: '自然食品専門店・スーパー', channel: '卸売', retailPrice: '380', wholesalePrice: '230', minOrderQty: '50', area: '全国', temperatureZone: '冷蔵', expiry: '2026-10-31', certification: 'なし', allergen: 'なし', jan: '4901234500008', pitch: '美容と健康志向の顧客層に人気です。' },
  { id: 'P09', companyId: 'EX05', productName: '大和抹茶どら焼き', category: '菓子', subCategory: '和菓子', description: '奈良県産抹茶を使用したどら焼き。', features: '抹茶の風味豊か', targetCustomer: '百貨店・土産店', desiredBuyer: '百貨店', channel: '卸売・直販', retailPrice: '250', wholesalePrice: '150', minOrderQty: '50', area: '近畿', temperatureZone: '常温', expiry: '2026-08-31', certification: 'なし', allergen: '小麦・卵・乳成分', jan: '4901234500009', pitch: '上品な甘さで幅広い世代に人気です。' },
  { id: 'P10', companyId: 'EX05', productName: '奈良の柿羊羹', category: '菓子', subCategory: '和菓子', description: '奈良県産の柿を使用した羊羹。', features: '柿の自然な甘み', targetCustomer: '百貨店・土産店', desiredBuyer: '百貨店', channel: '卸売', retailPrice: '480', wholesalePrice: '300', minOrderQty: '30', area: '近畿', temperatureZone: '常温', expiry: '2027-02-28', certification: 'なし', allergen: 'なし', jan: '4901234500010', pitch: '季節限定商品としても展開可能です。' },
  { id: 'P11', companyId: 'EX06', productName: '東北和紅茶リーフ', category: '飲料・茶', subCategory: '紅茶', description: '東北産茶葉を発酵させた和紅茶。', features: '国産紅茶の希少性', targetCustomer: 'カフェ・専門店', desiredBuyer: '百貨店・自然食品専門店', channel: '卸売・直販', retailPrice: '900', wholesalePrice: '560', minOrderQty: '20', area: '全国', temperatureZone: '常温', expiry: '2027-05-31', certification: 'なし', allergen: 'なし', jan: '4901234500011', pitch: '国産紅茶ならではの優しい味わいが特徴です。' },
  { id: 'P12', companyId: 'EX06', productName: '冷茶用ほうじ茶パック', category: '飲料・茶', subCategory: 'ほうじ茶', description: '東北産茶葉を使用した水出し用ほうじ茶パック。', features: '水出し対応・手軽', targetCustomer: 'スーパー・オフィス向け', desiredBuyer: 'スーパーマーケット', channel: '卸売', retailPrice: '400', wholesalePrice: '240', minOrderQty: '50', area: '全国', temperatureZone: '常温', expiry: '2027-04-30', certification: 'なし', allergen: 'なし', jan: '4901234500012', pitch: '手軽に水出しできる点がオフィス向けに好評です。' },
  { id: 'P13', companyId: 'EX07', productName: '京都七味唐辛子(缶入り)', category: '乾物・香辛料', subCategory: '香辛料', description: '京都の老舗製法による七味唐辛子。', features: '独自の香辛料ブレンド', targetCustomer: '百貨店・土産店', desiredBuyer: '百貨店', channel: '卸売・直販', retailPrice: '550', wholesalePrice: '340', minOrderQty: '30', area: '全国', temperatureZone: '常温', expiry: '2027-11-30', certification: 'なし', allergen: 'なし', jan: '4901234500013', pitch: 'お土産としても人気の定番商品です。' },
  { id: 'P14', companyId: 'EX07', productName: '出汁昆布セット', category: '乾物・香辛料', subCategory: '乾物', description: '厳選した昆布を使用した出汁用セット。', features: '上質な昆布使用', targetCustomer: '百貨店・高級スーパー', desiredBuyer: '百貨店', channel: '卸売', retailPrice: '800', wholesalePrice: '500', minOrderQty: '20', area: '全国', temperatureZone: '常温', expiry: '2028-03-31', certification: 'なし', allergen: 'なし', jan: '4901234500014', pitch: '上質な出汁を手軽に楽しめると好評です。' },
  { id: 'P15', companyId: 'EX08', productName: '湘南レモン食パン', category: 'パン・洋菓子', subCategory: '食パン', description: '湘南産レモンを練り込んだ食パン。', features: 'レモンの爽やかな風味', targetCustomer: '百貨店・カフェ', desiredBuyer: '百貨店・スーパーマーケット', channel: '卸売・直販', retailPrice: '650', wholesalePrice: '400', minOrderQty: '20', area: '関東', temperatureZone: '冷凍', expiry: '2026-09-30', certification: 'なし', allergen: '小麦・卵・乳成分', jan: '4901234500015', pitch: '爽やかな香りで朝食需要に人気です。' },
  { id: 'P16', companyId: 'EX08', productName: '鎌倉野菜のフォカッチャ', category: 'パン・洋菓子', subCategory: '惣菜パン', description: '鎌倉産野菜を練り込んだフォカッチャ。', features: '地元野菜の彩り', targetCustomer: 'カフェ・レストラン', desiredBuyer: 'スーパーマーケット', channel: '卸売', retailPrice: '480', wholesalePrice: '300', minOrderQty: '20', area: '関東', temperatureZone: '冷凍', expiry: '2026-09-30', certification: 'なし', allergen: '小麦・乳成分', jan: '4901234500016', pitch: '彩り豊かな見た目で惣菜コーナーに最適です。' },
  { id: 'P17', companyId: 'EX09', productName: '沖縄マンゴージャム', category: '果実加工品', subCategory: 'ジャム', description: '沖縄県産完熟マンゴーを使用したジャム。', features: '完熟マンゴー使用', targetCustomer: '百貨店・土産店', desiredBuyer: '百貨店・自然食品専門店', channel: '卸売・直販', retailPrice: '700', wholesalePrice: '430', minOrderQty: '30', area: '全国', temperatureZone: '常温', expiry: '2027-07-31', certification: 'なし', allergen: 'なし', jan: '4901234500017', pitch: '完熟マンゴーの濃厚な甘さが自慢です。' },
  { id: 'P18', companyId: 'EX09', productName: 'シークヮーサー果汁100%', category: '果実加工品', subCategory: '果汁飲料', description: '沖縄県産シークヮーサーを使用した100%果汁。', features: 'ノンアルコール・無添加', targetCustomer: '自然食品専門店・カフェ', desiredBuyer: '自然食品専門店', channel: '卸売', retailPrice: '900', wholesalePrice: '560', minOrderQty: '20', area: '全国', temperatureZone: '冷蔵', expiry: '2026-11-30', certification: 'なし', allergen: 'なし', jan: '4901234500018', pitch: '爽やかな酸味で健康志向層に人気です。' },
  { id: 'P19', companyId: 'EX10', productName: '奥飛騨手打ち蕎麦(乾麺)', category: '麺類', subCategory: '蕎麦', description: '奥飛騨産そば粉を使用した手打ち製法の乾麺。', features: '手打ち製法・コシが強い', targetCustomer: '百貨店・専門店', desiredBuyer: '百貨店・自然食品専門店', channel: '卸売・直販', retailPrice: '600', wholesalePrice: '370', minOrderQty: '30', area: '全国', temperatureZone: '常温', expiry: '2027-08-31', certification: 'なし', allergen: 'そば', jan: '4901234500019', pitch: 'コシの強さと風味の良さが評価されています。' },
  { id: 'P20', companyId: 'EX10', productName: '飛騨牛だし ほうとう', category: '麺類', subCategory: 'ほうとう', description: '飛騨牛だしを使用したほうとう麺セット。', features: '飛騨牛だし付属', targetCustomer: '外食チェーン・専門店', desiredBuyer: '外食チェーン', channel: '卸売', retailPrice: '750', wholesalePrice: '470', minOrderQty: '20', area: '全国', temperatureZone: '冷凍', expiry: '2027-01-31', certification: 'なし', allergen: '小麦・牛肉', jan: '4901234500020', pitch: '飛騨牛だしの濃厚な味わいが好評です。' },
];

const INITIAL_CONTACTS = [
  { companyId: 'EX01', department: '品質管理部', contactName: '佐々木健', role: '課長', email: 'sasaki@hokkaido-daichi.example.co.jp', mobile: '090-1234-9001', isPrimary: 'いいえ' },
  { companyId: 'EX03', department: '製造部', contactName: '林田恵', role: '主任', email: 'hayashida@kyushu-umaka.example.co.jp', mobile: '090-1234-9002', isPrimary: 'いいえ' },
  { companyId: 'BY01', department: '仕入部', contactName: '村上直樹', role: '部長', email: 'murakami@marufuku-shoji.example.co.jp', mobile: '080-2234-9003', isPrimary: 'はい' },
  { companyId: 'EX07', department: '営業部', contactName: '清水優子', role: '', email: 'shimizu@kyoto-shichimi.example.co.jp', mobile: '090-1234-9004', isPrimary: 'いいえ' },
  { companyId: 'BY04', department: '催事担当', contactName: '岡本さゆり', role: '係長', email: 'okamoto@tabemono-depart.example.co.jp', mobile: '080-2234-9005', isPrimary: 'いいえ' },
];

const IMAGE_SEED_PRODUCT_IDS = ['P01', 'P02', 'P05', 'P06', 'P07', 'P08', 'P19', 'P20'];
const INITIAL_PRODUCT_IMAGES = {};
IMAGE_SEED_PRODUCT_IDS.forEach((pid) => {
  INITIAL_PRODUCT_IMAGES[pid] = { main: PLACEHOLDER_IMG, subs: [null, null, null, null], package: null, usage: null };
});

const INITIAL_HISTORY = [
  { id: 1, datetime: '2026-06-15 10:20', company: '東北銘茶株式会社', channel: '電話', content: '一次リマインドの電話をするも不在', items: '基本情報、商品情報 ほか4項目', staff: '岡田', result: '不在', next: '2026-06-20' },
  { id: 2, datetime: '2026-06-18 09:00', company: '北海道大地フーズ株式会社', channel: 'メール', content: '【ご案内】食のコネクト商談会2026 ご登録のお願い', items: 'なし', staff: '中野', result: '成功', next: '-' },
  { id: 3, datetime: '2026-06-25 14:10', company: '株式会社フードサービス両国', channel: 'メール', content: '【至急】ご登録のお願い(3回目)', items: '基本情報 ほか3項目', staff: '石井', result: '成功', next: '-' },
  { id: 4, datetime: '2026-07-02 11:30', company: '信州発酵食品工房', channel: 'メール', content: '基本情報の修正依頼について', items: '基本情報', staff: '藤井', result: '成功', next: '2026-07-05' },
  { id: 5, datetime: '2026-07-04 16:45', company: 'たべもの百貨店株式会社', channel: '電話', content: '進捗確認のお電話。今週中対応予定と回答あり', items: '希望時間、スケジュール確認', staff: '藤井', result: '成功', next: '2026-07-10' },
  {
    id: 6, datetime: '2026-07-04 09:15', company: '信州発酵食品工房', channel: 'SMS',
    content: '【食のコネクト商談会事務局】田中健二様\n食のコネクト商談会2026:基本情報が未完了です。2026/07/15までに下記URLよりご回答ください。\nhttps://shoku-connect.example.jp/r/tok_demo0001\nTEL 03-0000-1234 / MAIL info@shoku-connect.example.jp',
    items: '基本情報', staff: '藤井', result: '成功', next: '-',
    sendReason: '修正依頼未対応(3日経過)', approvedBy: '藤井', externalService: EXTERNAL_SMS_SERVICE_NAME,
    externalMessageId: 'MSG-DEMO0001', errorReason: null, urlToken: 'tok_demo0001', urlAccessedAt: '2026-07-04 12:40', urlCompletedAt: null,
    costEstimateYen: SMS_COST_PER_MESSAGE,
  },
];

const INITIAL_MEETING_REQUESTS = {
  EX01: { wishes: [
    { id: 'w1', buyerId: 'BY01', rank: 1, reason: '卸売ルートでの全国展開を期待できるため', productId: 'P01' },
    { id: 'w2', buyerId: 'BY02', rank: 2, reason: '', productId: 'P02' },
  ], unavailable: ['BY04'], notes: '実演販売の可否について相談したい' },
  EX03: { wishes: [
    { id: 'w1', buyerId: 'BY01', rank: 1, reason: '安定した卸売量が見込めるため', productId: 'P05' },
    { id: 'w2', buyerId: 'BY03', rank: 2, reason: '', productId: 'P06' },
  ], unavailable: [], notes: '' },
  EX04: { wishes: [
    { id: 'w1', buyerId: 'BY01', rank: 1, reason: '自然食品分野への展開を期待', productId: 'P07' },
  ], unavailable: [], notes: '試食提供の準備があります' },
  EX06: { wishes: [
    { id: 'w1', buyerId: 'BY02', rank: 1, reason: '', productId: 'P11' },
  ], unavailable: [], notes: '' },
  EX07: { wishes: [], unavailable: [], notes: '' },
  EX08: { wishes: [
    { id: 'w1', buyerId: 'BY04', rank: 1, reason: '', productId: 'P15' },
    { id: 'w2', buyerId: 'BY02', rank: 2, reason: '', productId: 'P16' },
  ], unavailable: [], notes: '担当者不在期間があるため午後希望' },
  EX10: { wishes: [
    { id: 'w1', buyerId: 'BY04', rank: 1, reason: '', productId: 'P19' },
  ], unavailable: [], notes: '' },
  BY01: { wishes: [
    { id: 'w1', exhibitorId: 'EX01', rank: 1, reason: '卸先のスーパーで人気が見込めるため', productId: 'P01' },
    { id: 'w2', exhibitorId: 'EX04', rank: 2, reason: '発酵食品のラインナップ拡充のため', productId: 'P07' },
    { id: 'w3', exhibitorId: 'EX03', rank: 3, reason: '', productId: 'P05' },
  ], unavailable: [], interestCategories: ['農産加工品', '発酵食品', '水産加工品'], notes: '卸売価格と最低発注量を重視して商談したい' },
  BY02: { wishes: [
    { id: 'w1', exhibitorId: 'EX05', rank: 1, reason: '', productId: 'P09' },
    { id: 'w2', exhibitorId: 'EX06', rank: 2, reason: '', productId: 'P11' },
  ], unavailable: ['EX08'], interestCategories: ['菓子', '飲料・茶'], notes: '店頭の季節催事に合わせた商品を探している' },
  BY03: { wishes: [
    { id: 'w1', exhibitorId: 'EX03', rank: 1, reason: '', productId: 'P06' },
  ], unavailable: [], interestCategories: ['水産加工品'], notes: '' },
  BY04: { wishes: [
    { id: 'w1', exhibitorId: 'EX08', rank: 1, reason: '', productId: 'P15' },
    { id: 'w2', exhibitorId: 'EX05', rank: 2, reason: '', productId: 'P10' },
  ], unavailable: [], interestCategories: ['菓子', 'パン・洋菓子', '乾物・香辛料'], notes: '催事コーナー向けの商品を探している' },
};

// 第4段階(スケジュール調整)の試作用に、いくつかのマッチング候補を
// あらかじめ事務局が「採用」済みとして扱います(相互希望のペア全件 + バイヤーに人気の一部)。
const INITIAL_CANDIDATE_META = {
  EX01_BY01: { status: '採用' },
  EX03_BY01: { status: '採用' },
  EX03_BY03: { status: '採用' },
  EX04_BY01: { status: '採用' },
  EX06_BY02: { status: '採用' },
  EX08_BY04: { status: '採用' },
  EX05_BY02: { status: '採用' },
  EX05_BY04: { status: '採用' },
};

const INITIAL_SCHEDULE_SETTINGS = {
  eventDate: '2026-07-20',
  startTime: '10:00',
  endTime: '17:00',
  meetingDuration: 20,
  changeoverDuration: 5,
  breakStart: '12:00',
  breakEnd: '13:00',
  tableCount: 8,
  maxMeetingsPerBuyer: 6,
  maxMeetingsPerExhibitor: 6,
  maxConsecutiveMeetings: 3,
};

const _initialCandidatesForSchedule = generateCandidates(INITIAL_PARTICIPANTS, INITIAL_PRODUCTS, INITIAL_MEETING_REQUESTS, []);
const _approvedForInitialSchedule = _initialCandidatesForSchedule.filter((c) => INITIAL_CANDIDATE_META[c.id] && INITIAL_CANDIDATE_META[c.id].status === '採用');
const _initialAutoScheduleResult = autoSchedule(_approvedForInitialSchedule, INITIAL_PARTICIPANTS, INITIAL_SCHEDULE_SETTINGS);
const INITIAL_SCHEDULE_ITEMS = _initialAutoScheduleResult.placed;

// 事務局が既に確認依頼を出したことを示すサンプル(スケジュール確認状況の初期値)
const INITIAL_SCHEDULE_CONFIRMATIONS = {
  EX01: '承認', EX03: '未確認', EX04: '承認', EX05: '未確認', EX06: '未確認', EX08: '承認',
  BY01: '承認', BY02: '未確認', BY03: '修正希望', BY04: '承認',
};

// リマインド履歴のサンプルSMS(id:6)に対応する、専用URLの発行情報
const INITIAL_SMS_URL_TOKENS = {
  tok_demo0001: { companyId: 'EX04', issuedAt: '2026-07-04 09:15', expiresAt: '2026-07-11', accessedAt: '2026-07-04 12:40', completedAt: null, status: '有効' },
};

function emptyCompany(type) {
  const base = {
    id: '', type, companyName: '', companyNameKana: '', postalCode: '', address: '', phone: '', mobile: '',
    website: '', industry: '', introduction: '', referral: '', department: '', contactName: '', email: '', note: '',
    companyStatus: '仮登録', assignedStaff: STAFF_LIST[0], deadline: '2026-07-31', lastContactDate: null,
    mailCount: 0, smsCount: 0, actionState: '未対応', nextActionDate: null, modifiedRequestDate: null,
    scheduleTentativePublishedDate: null, memos: [],
    smsConsent: '同意', smsBlocked: false, importantChangeUnconfirmed: false,
    items: type === '出展者'
      ? { basicInfo: '未着手', productInfo: '未着手', productImage: '未着手', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' }
      : { basicInfo: '未着手', productInfo: '回答不要', productImage: '回答不要', meetingRequest: '未着手', preferredTime: '未着手', scheduleConfirm: '未着手' },
  };
  if (type === '出展者') return { ...base, category: '', boothNumber: '', availableTime: '未回答', lastUpdated: TODAY_STR, productCount: 0 };
  return { ...base, businessType: '', desiredCategory: '', visitTime: '未回答', desiredRank: '未設定', lastUpdated: TODAY_STR };
}

function emptyProduct(companyId) {
  return { id: '', companyId: companyId || '', productName: '', category: '', subCategory: '', description: '', features: '', targetCustomer: '', desiredBuyer: '', channel: '', retailPrice: '', wholesalePrice: '', minOrderQty: '', area: '', temperatureZone: '', expiry: '', certification: '', allergen: '', jan: '', pitch: '' };
}

/* =========================================================================
   小さなUI部品
   ========================================================================= */

function GlobalStyles() {
  return (
    <style>{`
      .btn-primary { background:#2F6FED; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px; font-weight:600; border:1px solid #2F6FED; }
      .btn-primary:hover { background:#2557c7; }
      .btn-primary:disabled { cursor:not-allowed; }
      .btn-secondary { background:#F1F5F9; color:#334155; padding:6px 14px; border-radius:6px; font-size:13px; font-weight:600; border:1px solid #CBD5E1; }
      .btn-secondary:hover { background:#E2E8F0; }
    `}</style>
  );
}

function StatusBadge({ status }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${STATUS_STYLE[status] || ''}`}>{status}</span>;
}

function ActionBadge({ state }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${ACTION_STYLE[state] || ''}`}>{state}</span>;
}

function MatchCategoryBadge({ category }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${MATCH_CATEGORY_STYLE[category] || ''}`}>{category}</span>;
}

function RegStatusBadge({ label }) {
  const map = {
    '未着手': 'bg-gray-100 text-gray-600 border-gray-300',
    '対応中': 'bg-blue-50 text-blue-700 border-blue-200',
    '登録完了': 'bg-green-50 text-green-700 border-green-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${map[label]}`}>{label}</span>;
}

function Chip({ children }) {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs border border-slate-200 whitespace-nowrap">{children}</span>;
}

function ProgressBar({ pct }) {
  const color = pct === 100 ? '#16A34A' : pct >= 50 ? '#2F6FED' : pct > 0 ? '#D97706' : '#94A3B8';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col text-xs text-slate-500 gap-1">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-700 bg-white focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SortableTh({ label, sortKey, sort, setSort, className }) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap cursor-pointer select-none ${className || ''}`}
      onClick={() => setSort((s) => (s.key === sortKey ? { key: sortKey, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: sortKey, dir: 'asc' }))}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <span style={{ width: 12, display: 'inline-block' }} />}
      </span>
    </th>
  );
}

function Toast({ message }) {
  return (
    <div className="fixed bottom-5 right-5 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
      {message}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400">
      <Info size={36} className="mb-3 text-slate-300" />
      <p className="font-semibold text-slate-500">「{label}」は次の開発段階で実装予定です</p>
      <p className="text-sm mt-1">ご指定いただいた段階の機能のみを、順を追って追加していきます。</p>
    </div>
  );
}

function RestrictedForRole() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400">
      <Info size={36} className="mb-3 text-slate-300" />
      <p className="font-semibold text-slate-500">この画面は閲覧権限では利用できません</p>
      <p className="text-sm mt-1">データの登録・変更を行う場合は、事務局担当者またはシステム管理者としてログインしてください。</p>
    </div>
  );
}

function PortalPlaceholder({ role, onSwitch }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400">
      <Users size={36} className="mb-3 text-slate-300" />
      <p className="font-semibold text-slate-500">{role}向けポータル画面は次の開発段階で実装予定です</p>
      <p className="text-sm mt-1 mb-4">現在は事務局向け機能の試作をご確認いただいています。</p>
      <button onClick={onSwitch} className="btn-primary">事務局担当者の画面に戻る</button>
    </div>
  );
}

/* =========================================================================
   サイドバー / ヘッダー
   ========================================================================= */

function Sidebar({ screen, setScreen, role, setRole }) {
  return (
    <aside className="hidden md:flex md:flex-col w-16 lg:w-60 shrink-0 text-white" style={{ backgroundColor: COLOR.navy }}>
      <div className="px-3 lg:px-5 py-5 border-b border-white/10">
        <div className="text-sm lg:text-base font-bold leading-tight">
          <span className="hidden lg:inline">商談マッチング</span>
          <span className="lg:hidden">MM</span>
        </div>
        <div className="hidden lg:block text-xs text-white/50 mt-0.5">事務局管理システム(試作 / 第3段階)</div>
      </div>
      <div className="px-2 lg:px-3 py-3 border-b border-white/10">
        <div className="hidden lg:block text-xs text-white/40 mb-1.5 px-1">利用者ロール</div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full text-xs rounded px-2 py-1.5 border-0"
          style={{ backgroundColor: COLOR.navyPanel, color: '#fff' }}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = screen === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setScreen(item.key)}
              className="w-full flex items-center gap-3 px-3 lg:px-5 py-2.5 text-sm"
              style={{
                backgroundColor: active ? COLOR.navyPanel : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                borderLeft: active ? `3px solid ${COLOR.blue}` : '3px solid transparent',
              }}
            >
              <Icon size={16} />
              <span className="hidden lg:inline flex-1 text-left">{item.label}</span>
              {!item.active && <span className="hidden lg:inline text-xs text-white/30 border border-white/20 rounded px-1">準備中</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TopBar({ screen, role }) {
  const navItem = NAV_ITEMS.find((n) => n.key === screen);
  const title = role === '出展者' ? '出展者ポータル' : role === 'バイヤー' ? 'バイヤーポータル' : (navItem ? navItem.label : '');
  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      <h1 className="font-bold text-slate-800 text-base">{title}</h1>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>現在のロール: <span className="font-semibold text-slate-600">{role}</span></span>
        <span className="hidden sm:inline">｜試作の本日日付: <span className="font-semibold text-slate-600">2026年7月5日(固定)</span></span>
      </div>
    </header>
  );
}

/* =========================================================================
   ダッシュボード
   ========================================================================= */

function StatCard({ icon: Icon, label, value, accentColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-lg border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow w-full"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="text-slate-400" />
        <ChevronRight size={14} className="text-slate-300" />
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </button>
  );
}

function BreakdownCard({ label, incomplete, total, onClick }) {
  const pct = total ? Math.round(((total - incomplete) / total) * 100) : 100;
  return (
    <button onClick={onClick} className="text-left bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-lg font-bold text-red-600">{incomplete}</span>
        <span className="text-xs text-slate-400">/ {total}件 未完了</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: COLOR.blue }} />
      </div>
    </button>
  );
}

function Dashboard({ participants, products, candidates, goProgress, goList, goProducts, goReminder, goMatching }) {
  const stats = useMemo(() => {
    const exhibitors = participants.filter((p) => p.type === '出展者');
    const buyers = participants.filter((p) => p.type === 'バイヤー');
    const completed = participants.filter((p) => calcProgress(p) === 100);
    const incomplete = participants.filter((p) => calcProgress(p) < 100);
    const overdue = incomplete.filter((p) => daysLeft(p) < 0);
    const targets = participants.filter((p) => isReminderTarget(p));
    const scheduleUnconfirmed = participants.filter((p) => {
      const req = REQUIRED_ITEMS_BY_TYPE[p.type];
      if (!req.includes('scheduleConfirm')) return false;
      const st = p.items.scheduleConfirm;
      return st !== '確認済み' && st !== '回答不要';
    });
    const breakdown = ITEM_DEFS.map((def) => {
      const applicable = participants.filter((p) => REQUIRED_ITEMS_BY_TYPE[p.type].includes(def.key) && p.items[def.key] !== '回答不要');
      const incompleteN = applicable.filter((p) => !COMPLETE_STATUSES.includes(p.items[def.key]));
      return { ...def, total: applicable.length, incomplete: incompleteN.length };
    });
    return { exhibitors, buyers, completed, incomplete, overdue, targets, scheduleUnconfirmed, breakdown };
  }, [participants]);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Store} label="出展者数" value={`${stats.exhibitors.length}社`} accentColor={COLOR.navy} onClick={() => goList('出展者')} />
        <StatCard icon={Users} label="バイヤー数" value={`${stats.buyers.length}社`} accentColor={COLOR.navy} onClick={() => goList('バイヤー')} />
        <StatCard icon={Package} label="商品登録数" value={`${products.length}件`} accentColor={COLOR.blue} onClick={goProducts} />
        <StatCard icon={CheckCircle2} label="登録完了者数" value={`${stats.completed.length}件`} accentColor="#16A34A" onClick={() => goProgress({ type: 'complete' })} />
        <StatCard icon={AlertTriangle} label="未対応者数" value={`${stats.incomplete.length}件`} accentColor="#D97706" onClick={() => goProgress({ type: 'incomplete' })} />
        <StatCard icon={Clock} label="期限超過者数" value={`${stats.overdue.length}件`} accentColor="#DC2626" onClick={() => goProgress({ type: 'overdue' })} />
        <StatCard icon={Bell} label="本日のリマインド対象者数" value={`${stats.targets.length}件`} accentColor="#DC2626" onClick={goReminder} />
        <StatCard icon={ListChecks} label="マッチング候補数" value={`${candidates.length}件`} accentColor="#7C3AED" onClick={goMatching} />
      </div>

      <h2 className="text-sm font-bold text-slate-600 mb-3">未対応項目の内訳</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.breakdown.map((b) => (
          <BreakdownCard key={b.key} label={b.label} incomplete={b.incomplete} total={b.total} onClick={() => goProgress({ type: 'item', item: b.key })} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   会社編集モーダル(出展者一覧・バイヤー一覧から利用)
   ========================================================================= */

function CompanyEditModal({ company, contacts, isNew, onClose, onSave, showToast }) {
  const [form, setForm] = useState(company);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const myContacts = contacts.filter((c) => c.companyId === form.id);

  const handleSave = () => {
    if (isNew && !form.id) { showToast('会社IDを入力してください'); return; }
    if (!form.companyName) { showToast('会社名を入力してください'); return; }
    onSave(form);
  };

  return (
    <Modal title={isNew ? '新規会社の登録' : `${form.companyName || form.id} の編集`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <label className="flex flex-col gap-1 text-xs text-slate-500">会社ID{isNew && <span className="text-red-500">*</span>}
          <input value={form.id} disabled={!isNew} onChange={(e) => set('id', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">会社名
          <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">会社名カナ
          <input value={form.companyNameKana || ''} onChange={(e) => set('companyNameKana', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">郵便番号
          <input value={form.postalCode || ''} onChange={(e) => set('postalCode', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">所在地
          <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">電話番号
          <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">携帯電話番号
          <input value={form.mobile || ''} onChange={(e) => set('mobile', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">Webサイト
          <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">業種
          <select value={form.industry || ''} onChange={(e) => set('industry', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">未設定</option>
            {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">会社紹介
          <textarea value={form.introduction || ''} onChange={(e) => set('introduction', e.target.value)} rows={2} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">紹介元
          <input value={form.referral || ''} onChange={(e) => set('referral', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">担当部署
          <input value={form.department || ''} onChange={(e) => set('department', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">担当者名
          <input value={form.contactName || ''} onChange={(e) => set('contactName', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">メールアドレス
          <input value={form.email || ''} onChange={(e) => set('email', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">ステータス
          <select value={form.companyStatus || '仮登録'} onChange={(e) => set('companyStatus', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            {COMPANY_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">備考
          <textarea value={form.note || ''} onChange={(e) => set('note', e.target.value)} rows={2} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
      </div>

      {!isNew && (
        <div className="border-t border-slate-200 pt-3 mb-3">
          <h4 className="text-xs font-bold text-slate-500 mb-2">担当者一覧(CSV「担当者情報」から取込)</h4>
          {myContacts.length === 0 ? <p className="text-xs text-slate-400">登録された追加担当者はありません</p> : (
            <div className="space-y-1">
              {myContacts.map((c, i) => (
                <div key={i} className="text-xs text-slate-600 flex flex-wrap gap-2 items-center border border-slate-100 rounded px-2 py-1">
                  <span className="font-medium">{c.contactName}</span>
                  <span className="text-slate-400">{c.department}{c.role ? ` / ${c.role}` : ''}</span>
                  <span className="text-slate-400">{c.email}</span>
                  {c.isPrimary === 'はい' && <Chip>主担当</Chip>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={handleSave} className="btn-primary">保存する</button>
      </div>
    </Modal>
  );
}

/* =========================================================================
   出展者一覧 / バイヤー一覧
   ========================================================================= */

const EXHIBITOR_CSV_COLS = [
  { label: '会社名', value: (r) => r.companyName },
  { label: '担当者', value: (r) => r.contactName },
  { label: '電話番号', value: (r) => r.mobile },
  { label: 'メール', value: (r) => r.email },
  { label: 'ブース', value: (r) => r.boothNumber },
  { label: 'カテゴリー', value: (r) => r.category },
  { label: '登録ステータス', value: (r) => r._statusLabel },
  { label: '商品登録数', value: (r) => r._productCount },
  { label: '対応可能時間', value: (r) => r.availableTime },
  { label: '最終更新日', value: (r) => r.lastUpdated },
];

function ExhibitorList({ participants, products, contacts, goProgress, onSaveCompany, showToast, canEdit }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('すべて');
  const [status, setStatus] = useState('すべて');
  const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => {
    let list = participants.filter((p) => p.type === '出展者');
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((p) => p.companyName.includes(q) || p.contactName.includes(q));
    }
    if (category !== 'すべて') list = list.filter((p) => p.category === category);
    if (status !== 'すべて') list = list.filter((p) => regStatusLabel(p) === status);
    list = list.map((p) => ({ ...p, _progress: calcProgress(p), _statusLabel: regStatusLabel(p), _productCount: products.filter((pr) => pr.companyId === p.id).length }));
    return sortRows(list, sort);
  }, [participants, products, search, category, status, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          会社名・担当者で検索
          <div className="relative">
            <Search size={14} className="absolute left-2 top-2 text-slate-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="例:北海道" className="pl-7 pr-2 py-1.5 border border-slate-300 rounded-md text-sm w-52" />
          </div>
        </label>
        <FilterSelect label="カテゴリー" value={category} onChange={setCategory} options={EXHIBITOR_CATEGORIES} />
        <FilterSelect label="登録ステータス" value={status} onChange={setStatus} options={['すべて', '未着手', '対応中', '登録完了']} />
        <div className="flex-1" />
        <button onClick={() => exportCSV('出展者一覧.csv', rows, EXHIBITOR_CSV_COLS)} className="btn-secondary">CSV出力</button>
        {canEdit && <button onClick={() => setEditing({ isNew: true, data: emptyCompany('出展者') })} className="btn-primary">＋新規出展者を追加</button>}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortableTh label="会社名" sortKey="companyName" sort={sort} setSort={setSort} />
              <SortableTh label="担当者" sortKey="contactName" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">電話番号</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">メールアドレス</th>
              <SortableTh label="ブース" sortKey="boothNumber" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">カテゴリー</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">登録ステータス</th>
              <SortableTh label="商品登録数" sortKey="_productCount" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">対応可能時間</th>
              <SortableTh label="最終更新日" sortKey="lastUpdated" sort={sort} setSort={setSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.companyName}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.contactName}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.mobile}</td>
                <td className="px-3 py-2 text-slate-500">{p.email}</td>
                <td className="px-3 py-2 text-slate-500">{p.boothNumber}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.category}</td>
                <td className="px-3 py-2"><RegStatusBadge label={p._statusLabel} /></td>
                <td className="px-3 py-2 text-slate-500">{p._productCount}件</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.availableTime}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.lastUpdated}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => goProgress({ type: 'single', id: p.id })} className="text-xs font-semibold mr-2" style={{ color: COLOR.blue }}>進捗を見る</button>
                  {canEdit && <button onClick={() => setEditing({ isNew: false, data: p })} className="text-xs text-slate-500">編集</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="text-center text-slate-400 py-8">該当する出展者がいません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{rows.length}件を表示中</p>
      {editing && (
        <CompanyEditModal
          company={editing.data}
          isNew={editing.isNew}
          contacts={contacts}
          onClose={() => setEditing(null)}
          onSave={(form) => { onSaveCompany(form, editing.isNew); setEditing(null); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

const BUYER_CSV_COLS = [
  { label: '会社名', value: (r) => r.companyName },
  { label: '担当者', value: (r) => r.contactName },
  { label: '連絡先メール', value: (r) => r.email },
  { label: '連絡先電話', value: (r) => r.mobile },
  { label: '業態', value: (r) => r.businessType },
  { label: '希望カテゴリー', value: (r) => r.desiredCategory },
  { label: '登録ステータス', value: (r) => r._statusLabel },
  { label: '来場可能時間', value: (r) => r.visitTime },
  { label: '希望順位', value: (r) => r.desiredRank },
];

function BuyerList({ participants, contacts, goProgress, onSaveCompany, showToast, canEdit }) {
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('すべて');
  const [status, setStatus] = useState('すべて');
  const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => {
    let list = participants.filter((p) => p.type === 'バイヤー');
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((p) => p.companyName.includes(q) || p.contactName.includes(q));
    }
    if (businessType !== 'すべて') list = list.filter((p) => p.businessType === businessType);
    if (status !== 'すべて') list = list.filter((p) => regStatusLabel(p) === status);
    list = list.map((p) => ({ ...p, _progress: calcProgress(p), _statusLabel: regStatusLabel(p) }));
    return sortRows(list, sort);
  }, [participants, search, businessType, status, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          会社名・担当者で検索
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-md text-sm w-52" />
        </label>
        <FilterSelect label="業態" value={businessType} onChange={setBusinessType} options={BUYER_BUSINESS_TYPES} />
        <FilterSelect label="登録ステータス" value={status} onChange={setStatus} options={['すべて', '未着手', '対応中', '登録完了']} />
        <div className="flex-1" />
        <button onClick={() => exportCSV('バイヤー一覧.csv', rows, BUYER_CSV_COLS)} className="btn-secondary">CSV出力</button>
        {canEdit && <button onClick={() => setEditing({ isNew: true, data: emptyCompany('バイヤー') })} className="btn-primary">＋新規バイヤーを追加</button>}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortableTh label="会社名" sortKey="companyName" sort={sort} setSort={setSort} />
              <SortableTh label="担当者" sortKey="contactName" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">連絡先</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">業態</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">希望カテゴリー</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">登録ステータス</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">来場可能時間</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">希望順位</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.companyName}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.contactName}</td>
                <td className="px-3 py-2 text-slate-500 text-xs">
                  <div>{p.email}</div>
                  <div>{p.mobile}</div>
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.businessType}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.desiredCategory}</td>
                <td className="px-3 py-2"><RegStatusBadge label={p._statusLabel} /></td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.visitTime}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.desiredRank}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => goProgress({ type: 'single', id: p.id })} className="text-xs font-semibold mr-2" style={{ color: COLOR.blue }}>進捗を見る</button>
                  {canEdit && <button onClick={() => setEditing({ isNew: false, data: p })} className="text-xs text-slate-500">編集</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-8">該当するバイヤーがいません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{rows.length}件を表示中</p>
      {editing && (
        <CompanyEditModal
          company={editing.data}
          isNew={editing.isNew}
          contacts={contacts}
          onClose={() => setEditing(null)}
          onSave={(form) => { onSaveCompany(form, editing.isNew); setEditing(null); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/* =========================================================================
   商品情報管理
   ========================================================================= */

const PRODUCT_CSV_COLS = PRODUCT_FIELDS.map((f) => ({ label: f.label, value: (r) => r[f.key === 'productId' ? 'id' : f.key] }));

function ProductEditModal({ product, isNew, exhibitors, onClose, onSave, showToast }) {
  const [form, setForm] = useState(product);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (isNew && !form.id) { showToast('商品IDを入力してください'); return; }
    if (!form.companyId) { showToast('会社ID(出展者)を選択してください'); return; }
    if (!form.productName) { showToast('商品名を入力してください'); return; }
    onSave(form);
  };

  return (
    <Modal title={isNew ? '新規商品の登録' : `${form.productName || form.id} の編集`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <label className="flex flex-col gap-1 text-xs text-slate-500">商品ID{isNew && <span className="text-red-500">*</span>}
          <input value={form.id} disabled={!isNew} onChange={(e) => set('id', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">会社ID(出展者)
          <select value={form.companyId} onChange={(e) => set('companyId', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">選択してください</option>
            {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.id} - {e.companyName}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">商品名
          <input value={form.productName} onChange={(e) => set('productName', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">商品カテゴリー
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">未設定</option>
            {PRODUCT_CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">サブカテゴリー
          <input value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">商品説明
          <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">商品の特徴
          <textarea value={form.features || ''} onChange={(e) => set('features', e.target.value)} rows={2} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">想定顧客
          <input value={form.targetCustomer || ''} onChange={(e) => set('targetCustomer', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">希望販売先
          <input value={form.desiredBuyer || ''} onChange={(e) => set('desiredBuyer', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">販売チャネル
          <input value={form.channel || ''} onChange={(e) => set('channel', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">小売価格(円)
          <input value={form.retailPrice || ''} onChange={(e) => set('retailPrice', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">卸売価格(円)
          <input value={form.wholesalePrice || ''} onChange={(e) => set('wholesalePrice', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">最低発注量
          <input value={form.minOrderQty || ''} onChange={(e) => set('minOrderQty', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">対応エリア
          <input value={form.area || ''} onChange={(e) => set('area', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">温度帯
          <select value={form.temperatureZone || ''} onChange={(e) => set('temperatureZone', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">未設定</option>
            {TEMPERATURE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">賞味期限(目安日)
          <input type="date" value={form.expiry || ''} onChange={(e) => set('expiry', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">認証
          <input value={form.certification || ''} onChange={(e) => set('certification', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">アレルゲン
          <input value={form.allergen || ''} onChange={(e) => set('allergen', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">JANコード
          <input value={form.jan || ''} onChange={(e) => set('jan', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">商談時の訴求ポイント
          <textarea value={form.pitch || ''} onChange={(e) => set('pitch', e.target.value)} rows={2} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={handleSave} className="btn-primary">保存する</button>
      </div>
    </Modal>
  );
}

function ProductManagementScreen({ participants, products, onSaveProduct, onDeleteProduct, showToast, goImages, canEdit }) {
  const exhibitors = participants.filter((p) => p.type === '出展者');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('すべて');
  const [categoryFilter, setCategoryFilter] = useState('すべて');
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' });
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const companyName = (id) => { const c = exhibitors.find((e) => e.id === id); return c ? c.companyName : id; };

  const rows = useMemo(() => {
    let list = products.map((p) => ({ ...p, _companyName: companyName(p.companyId) }));
    if (search.trim()) { const q = search.trim(); list = list.filter((p) => p.productName.includes(q) || p._companyName.includes(q)); }
    if (companyFilter !== 'すべて') list = list.filter((p) => p.companyId === companyFilter);
    if (categoryFilter !== 'すべて') list = list.filter((p) => p.category === categoryFilter);
    return sortRows(list, sort);
    // eslint-disable-next-line
  }, [products, search, companyFilter, categoryFilter, sort, participants]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          商品名・会社名で検索
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-md text-sm w-52" />
        </label>
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          出展者
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
            <option value="すべて">すべて</option>
            {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.companyName}</option>)}
          </select>
        </label>
        <FilterSelect label="カテゴリー" value={categoryFilter} onChange={setCategoryFilter} options={['すべて', ...PRODUCT_CATEGORY_OPTIONS]} />
        <div className="flex-1" />
        <button onClick={() => exportCSV('商品情報.csv', rows, PRODUCT_CSV_COLS)} className="btn-secondary">CSV出力</button>
        {canEdit && <button onClick={() => setEditing({ isNew: true, data: emptyProduct(companyFilter !== 'すべて' ? companyFilter : '') })} className="btn-primary">＋新規商品を追加</button>}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortableTh label="商品ID" sortKey="id" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">出展者</th>
              <SortableTh label="商品名" sortKey="productName" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">カテゴリー</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">小売価格</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">卸売価格</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">温度帯</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">画像</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.id}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p._companyName}</td>
                <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.productName}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.category}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.retailPrice ? `¥${p.retailPrice}` : '-'}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.wholesalePrice ? `¥${p.wholesalePrice}` : '-'}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.temperatureZone || '-'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => goImages(p.id)} className="text-xs font-semibold whitespace-nowrap" style={{ color: COLOR.blue }}>画像を管理</button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {canEdit && <button onClick={() => setEditing({ isNew: false, data: p })} className="text-xs text-slate-500 mr-2">編集</button>}
                  {canEdit && (confirmDeleteId === p.id ? (
                    <span className="text-xs">
                      本当に削除しますか？
                      <button onClick={() => { onDeleteProduct(p.id); setConfirmDeleteId(null); }} className="text-red-600 font-semibold ml-1">はい</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 ml-1">いいえ</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(p.id)} className="text-xs text-red-500">削除</button>
                  ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-8">該当する商品がありません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{rows.length}件を表示中</p>
      {editing && (
        <ProductEditModal
          product={editing.data}
          isNew={editing.isNew}
          exhibitors={exhibitors}
          onClose={() => setEditing(null)}
          onSave={(form) => { onSaveProduct(form, editing.isNew); setEditing(null); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/* =========================================================================
   商品画像アップロード
   ========================================================================= */

function ImageDropSlot({ label, value, onSelect, onRemove, small, readOnly }) {
  const inputRef = useRef(null);
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div
        onClick={() => !readOnly && inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { if (!readOnly) e.preventDefault(); }}
        onDrop={(e) => { if (readOnly) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onSelect(f); }}
        className="relative border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50"
        style={{ width: small ? 100 : 160, height: small ? 100 : 120, cursor: readOnly ? 'default' : 'pointer' }}
      >
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400 text-center px-2">{readOnly ? '未登録' : <>クリックまたは<br />ドラッグ＆ドロップ</>}</span>
        )}
        {!readOnly && <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) onSelect(f); e.target.value = ''; }} />}
      </div>
      {value && !readOnly && <button onClick={onRemove} className="text-xs text-red-500 mt-1">削除</button>}
    </div>
  );
}

function ProductImageEditor({ images, onChange, readOnly }) {
  const state = images;

  const setMain = async (file) => { const url = await readFileAsDataURL(file); onChange({ ...state, main: url }); };
  const setSub = async (idx, file) => { const url = await readFileAsDataURL(file); const subs = [...state.subs]; subs[idx] = url; onChange({ ...state, subs }); };
  const setPackage = async (file) => { const url = await readFileAsDataURL(file); onChange({ ...state, package: url }); };
  const setUsage = async (file) => { const url = await readFileAsDataURL(file); onChange({ ...state, usage: url }); };
  const removeSub = (idx) => { const subs = [...state.subs]; subs[idx] = null; onChange({ ...state, subs }); };
  const moveSub = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= state.subs.length) return;
    const subs = [...state.subs];
    const tmp = subs[idx]; subs[idx] = subs[target]; subs[target] = tmp;
    onChange({ ...state, subs });
  };
  const makeMain = (idx) => {
    const subs = [...state.subs];
    const chosen = subs[idx];
    if (!chosen) return;
    subs[idx] = state.main;
    onChange({ ...state, main: chosen, subs });
  };

  return (
    <div className="space-y-5">
      <div>
        <ImageDropSlot label="メイン画像(1枚・必須)" value={state.main} onSelect={setMain} onRemove={() => onChange({ ...state, main: null })} readOnly={readOnly} />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">サブ画像(最大4枚)</p>
        <div className="flex flex-wrap gap-3">
          {state.subs.map((s, i) => (
            <div key={i}>
              <ImageDropSlot label={`サブ${i + 1}`} value={s} onSelect={(f) => setSub(i, f)} onRemove={() => removeSub(i)} small readOnly={readOnly} />
              {s && !readOnly && (
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => moveSub(i, -1)} className="text-xs text-slate-400" title="左へ"><ArrowLeft size={12} /></button>
                  <button onClick={() => makeMain(i)} className="text-xs text-amber-600" title="メインにする"><Star size={12} /></button>
                  <button onClick={() => moveSub(i, 1)} className="text-xs text-slate-400" title="右へ"><ArrowRight size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <ImageDropSlot label="パッケージ画像" value={state.package} onSelect={setPackage} onRemove={() => onChange({ ...state, package: null })} readOnly={readOnly} />
        <ImageDropSlot label="使用イメージ" value={state.usage} onSelect={setUsage} onRemove={() => onChange({ ...state, usage: null })} readOnly={readOnly} />
      </div>
    </div>
  );
}

function ProductImageScreen({ participants, products, productImages, setProductImage, selectedProductId, setSelectedProductId, canEdit }) {
  const exhibitors = participants.filter((p) => p.type === '出展者');
  const [companyFilter, setCompanyFilter] = useState('すべて');
  const [onlyMissing, setOnlyMissing] = useState(false);

  const list = useMemo(() => {
    let l = products.map((p) => ({ ...p, _hasMain: isImageComplete(productImages, p.id), _company: exhibitors.find((e) => e.id === p.companyId) }));
    if (companyFilter !== 'すべて') l = l.filter((p) => p.companyId === companyFilter);
    if (onlyMissing) l = l.filter((p) => !p._hasMain);
    return l;
    // eslint-disable-next-line
  }, [products, productImages, companyFilter, onlyMissing, participants]);

  const missingCount = products.filter((p) => !isImageComplete(productImages, p.id)).length;
  const selected = products.find((p) => p.id === selectedProductId) || list[0] || null;

  return (
    <div className="flex gap-4" style={{ minHeight: 500 }}>
      <div className="w-72 shrink-0 bg-white rounded-lg border border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="すべて">すべての出展者</option>
            {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.companyName}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            画像未登録の商品のみ表示({missingCount}件)
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProductId(p.id)}
              className="w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between gap-2"
              style={{ backgroundColor: selected && selected.id === p.id ? '#EFF6FF' : 'transparent' }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">{p.productName}</div>
                <div className="text-xs text-slate-400 truncate">{p._company ? p._company.companyName : p.companyId}</div>
              </div>
              {p._hasMain ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
            </button>
          ))}
          {list.length === 0 && <p className="text-xs text-slate-400 text-center py-8">該当する商品がありません</p>}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-lg border border-slate-200 p-5">
        {selected ? (
          <>
            <h3 className="font-bold text-slate-800 mb-1">{selected.productName}</h3>
            <p className="text-xs text-slate-400 mb-4">{selected.companyId} / {(exhibitors.find((e) => e.id === selected.companyId) || {}).companyName}</p>
            {!canEdit && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mb-4">閲覧権限のため、画像は確認のみ行えます。</p>}
            <ProductImageEditor
              images={getProductImageState(productImages, selected.id)}
              onChange={(next) => setProductImage(selected.id, next)}
              readOnly={!canEdit}
            />
          </>
        ) : (
          <p className="text-sm text-slate-400">左の一覧から商品を選択してください</p>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   CSV一括アップロード
   ========================================================================= */

const STEP_LABELS = ['CSVファイルを選択', '内容をプレビュー', '列の紐付け', 'エラー確認', 'データの振り分け', '登録内容を確定'];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: active ? COLOR.blue : done ? '#DCFCE7' : '#F1F5F9', color: active ? '#fff' : done ? '#166534' : '#94A3B8' }}
            >
              <span>{n}</span><span className="hidden lg:inline">{label}</span>
            </div>
            {n < STEP_LABELS.length && <ChevronRight size={12} className="text-slate-300 mx-0.5" />}
          </div>
        );
      })}
    </div>
  );
}

function CSVImportScreen({ participants, onApply, showToast }) {
  const [importType, setImportType] = useState('exhibitorCompany');
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [results, setResults] = useState(null);

  const cfg = IMPORT_TYPES[importType];

  const resetAll = () => { setStep(1); setFileName(''); setHeaders([]); setDataRows([]); setMapping({}); setResults(null); };
  const handleTypeChange = (t) => { setImportType(t); resetAll(); };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result);
      const rows = parseCSV(text);
      if (rows.length === 0) { showToast('CSVの内容を読み取れませんでした'); return; }
      const hdr = rows[0];
      const body = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
      setHeaders(hdr);
      setDataRows(body);
      setFileName(file.name);
      const auto = {};
      cfg.fields.forEach((f) => {
        const idx = hdr.findIndex((h) => String(h).trim() === f.label);
        auto[f.key] = idx;
      });
      setMapping(auto);
      setStep(2);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const runCheck = () => {
    const context = {
      fixedKubun: cfg.fixedKubun,
      existingCompanyIds: cfg.kind === 'product'
        ? participants.filter((p) => p.type === '出展者').map((p) => p.id)
        : participants.map((p) => p.id),
    };
    setResults(runValidation(cfg.fields, dataRows, mapping, context));
    setStep(4);
  };

  const validRows = results ? results.filter((r) => r.errors.length === 0) : [];
  const errorRows = results ? results.filter((r) => r.errors.length > 0) : [];
  const errorEntries = errorRows.flatMap((r) => r.errors);

  const confirmRegister = () => {
    onApply(importType, validRows.map((r) => r.data));
    showToast(`${validRows.length}件を登録しました${errorRows.length > 0 ? `(エラー${errorRows.length}件は未登録)` : ''}`);
    resetAll();
  };

  return (
    <div>
      <StepIndicator step={step} />

      {step === 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <label className="flex flex-col text-xs text-slate-500 gap-1">
              取込データ種別
              <select value={importType} onChange={(e) => handleTypeChange(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                {Object.entries(IMPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <button onClick={() => downloadTextFile(`${cfg.label}_テンプレート.csv`, buildTemplateCSV(cfg))} className="btn-secondary">テンプレートをダウンロード</button>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center"
          >
            <UploadCloud size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 mb-2">CSVファイルをドラッグ＆ドロップ、または</p>
            <label className="btn-primary inline-block cursor-pointer">
              ファイルを選択
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </label>
            {fileName && <p className="text-xs text-slate-400 mt-3">選択中のファイル: {fileName}</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-3">{fileName} を読み込みました({dataRows.length}行)。内容をご確認ください。</p>
          <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4" style={{ maxHeight: 320 }}>
            <table className="text-xs w-full">
              <thead className="bg-slate-50"><tr>{headers.map((h, i) => <th key={i} className="px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {dataRows.slice(0, 15).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {dataRows.length > 15 && <p className="text-xs text-slate-400 mb-3">他{dataRows.length - 15}行(表示省略)</p>}
          <div className="flex justify-between">
            <button onClick={resetAll} className="btn-secondary">やり直す</button>
            <button onClick={() => setStep(3)} className="btn-primary">次へ:列を紐付ける</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-3">CSVの列と、システムの項目を対応付けてください。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {cfg.fields.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-2 text-sm border border-slate-200 rounded px-3 py-2">
                <span className="text-slate-600">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
                <select value={mapping[f.key] != null ? mapping[f.key] : -1} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))} className="border border-slate-300 rounded px-2 py-1 text-xs">
                  <option value={-1}>対応する列なし</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">戻る</button>
            <button onClick={runCheck} className="btn-primary">次へ:エラーを確認する</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-3">
            全{dataRows.length}行中、<span className="font-semibold text-red-600">{errorRows.length}行</span>にエラーがあります。
          </p>
          {errorEntries.length === 0 ? (
            <p className="text-sm text-green-600 mb-4">エラーは見つかりませんでした。すべての行を登録できます。</p>
          ) : (
            <div className="overflow-x-auto border border-red-200 rounded-lg mb-4" style={{ maxHeight: 320 }}>
              <table className="text-xs w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-red-700">行番号</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-red-700">項目</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-red-700">エラー理由</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-red-700">修正方法</th>
                  </tr>
                </thead>
                <tbody>
                  {errorEntries.map((e, i) => (
                    <tr key={i} className="border-t border-red-100">
                      <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{e.row}行目</td>
                      <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{e.field}</td>
                      <td className="px-2 py-1.5 text-red-600">{e.reason}</td>
                      <td className="px-2 py-1.5 text-slate-500">{e.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-secondary">列の紐付けに戻る</button>
            <button onClick={() => setStep(5)} className="btn-primary">次へ:データを振り分ける</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{validRows.length}件</div>
              <div className="text-xs text-green-700">正常データ(登録されます)</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{errorRows.length}件</div>
              <div className="text-xs text-red-700">エラーデータ(登録されません)</div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 mb-2">正常データのプレビュー</p>
          <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4" style={{ maxHeight: 260 }}>
            <table className="text-xs w-full">
              <thead className="bg-slate-50"><tr>{cfg.fields.map((f) => <th key={f.key} className="px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">{f.label}</th>)}</tr></thead>
              <tbody>
                {validRows.slice(0, 15).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">{cfg.fields.map((f) => <td key={f.key} className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{r.data[f.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="btn-secondary">戻る</button>
            <button onClick={() => setStep(6)} className="btn-primary" disabled={validRows.length === 0} style={{ opacity: validRows.length === 0 ? 0.4 : 1 }}>次へ:登録内容を確定する</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-4">
            「{cfg.label}」として <span className="font-semibold text-green-700">{validRows.length}件</span> を登録します。
            {errorRows.length > 0 && <> エラーのあった<span className="font-semibold text-red-600">{errorRows.length}件</span>は登録されません。</>}
            既存のIDと同じ場合は情報が上書き更新されます。
          </p>
          <div className="flex justify-between">
            <button onClick={() => setStep(5)} className="btn-secondary">戻る</button>
            <button onClick={confirmRegister} className="btn-primary" disabled={validRows.length === 0} style={{ opacity: validRows.length === 0 ? 0.4 : 1 }}>この内容で登録する</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   進捗管理
   ========================================================================= */

const PROGRESS_CSV_COLS = [
  { label: '会社名', value: (r) => r.companyName },
  { label: '区分', value: (r) => r.type },
  { label: '担当者名', value: (r) => r.contactName },
  { label: 'メール', value: (r) => r.email },
  { label: '携帯電話', value: (r) => r.mobile },
  ...ITEM_DEFS.map((d) => ({ label: d.label, value: (r) => r.items[d.key] })),
  { label: '全体進捗率', value: (r) => `${r._progress}%` },
  { label: '回答期限', value: (r) => r.deadline },
  { label: '最終連絡日', value: (r) => r.lastContactDate || '' },
  { label: '担当事務局員', value: (r) => r.assignedStaff },
];

function ProgressScreen({ participants, preset, onClearPreset, canEdit, updateItemStatus, updateStaff, onOpenDetail }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('すべて');
  const [staffFilter, setStaffFilter] = useState('すべて');
  const [statusFilter, setStatusFilter] = useState('すべて');
  const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });

  const rows = useMemo(() => {
    let list = participants.filter((p) => matchesPreset(p, preset));
    if (typeFilter !== 'すべて') list = list.filter((p) => p.type === typeFilter);
    if (staffFilter !== 'すべて') list = list.filter((p) => p.assignedStaff === staffFilter);
    if (statusFilter !== 'すべて') {
      list = list.filter((p) => {
        if (statusFilter === '期限超過') return calcProgress(p) < 100 && daysLeft(p) < 0;
        return regStatusLabel(p) === statusFilter;
      });
    }
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((p) => p.companyName.includes(q) || p.contactName.includes(q));
    }
    list = list.map((p) => ({ ...p, _progress: calcProgress(p) }));
    return sortRows(list, sort);
  }, [participants, preset, typeFilter, staffFilter, statusFilter, search, sort]);

  return (
    <div>
      {preset && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-3 py-2 mb-3">
          <span>{presetLabel(preset)}</span>
          <button onClick={onClearPreset} className="text-xs font-semibold underline">絞り込みを解除</button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          検索
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="会社名・担当者名" className="px-2 py-1.5 border border-slate-300 rounded-md text-sm w-48" />
        </label>
        <FilterSelect label="区分" value={typeFilter} onChange={setTypeFilter} options={['すべて', '出展者', 'バイヤー']} />
        <FilterSelect label="全体ステータス" value={statusFilter} onChange={setStatusFilter} options={['すべて', '未着手', '対応中', '登録完了', '期限超過']} />
        <FilterSelect label="担当事務局員" value={staffFilter} onChange={setStaffFilter} options={['すべて', ...STAFF_LIST]} />
        <div className="flex-1" />
        <button onClick={() => exportCSV('進捗管理.csv', rows, PROGRESS_CSV_COLS)} className="btn-secondary">CSV出力</button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortableTh label="会社名" sortKey="companyName" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">区分</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">担当者名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">連絡先</th>
              {ITEM_DEFS.map((d) => <th key={d.key} className="px-2 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{d.label}</th>)}
              <SortableTh label="全体進捗率" sortKey="_progress" sort={sort} setSort={setSort} />
              <SortableTh label="回答期限" sortKey="deadline" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">最終連絡日</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">担当事務局員</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const req = REQUIRED_ITEMS_BY_TYPE[p.type];
              const dl = daysLeftLabel(p);
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.companyName}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{p.type}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.contactName}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1"><Mail size={11} />{p.email}</div>
                    <div className="flex items-center gap-1 mt-0.5"><Phone size={11} />{p.mobile}</div>
                  </td>
                  {ITEM_DEFS.map((d) => {
                    const applicable = req.includes(d.key);
                    const val = applicable ? p.items[d.key] : '回答不要';
                    if (d.key === 'productImage') {
                      return (
                        <td key={d.key} className="px-2 py-2">
                          <StatusBadge status={val} />
                          {applicable && <div className="text-xs text-slate-300 mt-0.5">画像登録と連動</div>}
                        </td>
                      );
                    }
                    return (
                      <td key={d.key} className="px-2 py-2">
                        {canEdit ? (
                          <select
                            value={val}
                            disabled={!applicable}
                            onChange={(e) => updateItemStatus(p.id, d.key, e.target.value)}
                            className={`text-xs rounded border px-1.5 py-1 ${STATUS_STYLE[val]}`}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : <StatusBadge status={val} />}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2" style={{ minWidth: 110 }}>
                    <ProgressBar pct={p._progress} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>{fmtDate(p.deadline)}</div>
                    <div className={`text-xs ${dl.cls}`}>{dl.text}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.lastContactDate ? fmtDate(p.lastContactDate) : '未連絡'}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {canEdit ? (
                      <select value={p.assignedStaff} onChange={(e) => updateStaff(p.id, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-1">
                        {STAFF_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : p.assignedStaff}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => onOpenDetail(p.id)} className="text-xs font-semibold whitespace-nowrap" style={{ color: COLOR.blue }}>詳細</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={12} className="text-center text-slate-400 py-8">該当するデータがありません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{rows.length}件を表示中</p>
    </div>
  );
}

/* =========================================================================
   リマインド管理
   ========================================================================= */

function ReminderScreen({ participants, onOpenCompose }) {
  const [typeFilter, setTypeFilter] = useState('すべて');
  const [itemFilter, setItemFilter] = useState('すべて');
  const [deadlineFilter, setDeadlineFilter] = useState('すべて');
  const [overdueFilter, setOverdueFilter] = useState('すべて');
  const [contactFilter, setContactFilter] = useState('すべて');
  const [staffFilter, setStaffFilter] = useState('すべて');
  const [stateFilter, setStateFilter] = useState('すべて');
  const [countFilter, setCountFilter] = useState('すべて');
  const [selected, setSelected] = useState([]);
  const [showExcluded, setShowExcluded] = useState(false);

  const { targets, excluded } = useMemo(() => {
    const targets = [];
    const excluded = [];
    participants.forEach((p) => {
      const reasons = computeReminderReasons(p);
      if (reasons.length === 0) return;
      const excl = exclusionReason(p);
      if (excl) excluded.push({ ...p, reasons, excl });
      else targets.push({ ...p, reasons });
    });
    return { targets, excluded };
  }, [participants]);

  const filtered = useMemo(() => {
    let list = targets;
    if (typeFilter !== 'すべて') list = list.filter((p) => p.type === typeFilter);
    if (itemFilter !== 'すべて') list = list.filter((p) => incompleteItemLabels(p).includes(itemFilter));
    if (deadlineFilter !== 'すべて') {
      list = list.filter((p) => {
        const d = daysLeft(p);
        if (deadlineFilter === '今週中') return d >= 0 && d <= 7;
        if (deadlineFilter === '来週以降') return d > 7;
        if (deadlineFilter === '超過済み') return d < 0;
        return true;
      });
    }
    if (overdueFilter !== 'すべて') list = list.filter((p) => (overdueFilter === '超過のみ' ? daysLeft(p) < 0 : daysLeft(p) >= 0));
    if (contactFilter !== 'すべて') {
      list = list.filter((p) => {
        if (contactFilter === '未連絡') return !p.lastContactDate;
        if (contactFilter === '1週間以内') return p.lastContactDate && daysBetween(TODAY, parseDate(p.lastContactDate)) <= 7;
        if (contactFilter === '1週間より前') return p.lastContactDate && daysBetween(TODAY, parseDate(p.lastContactDate)) > 7;
        return true;
      });
    }
    if (staffFilter !== 'すべて') list = list.filter((p) => p.assignedStaff === staffFilter);
    if (stateFilter !== 'すべて') list = list.filter((p) => p.actionState === stateFilter);
    if (countFilter !== 'すべて') {
      list = list.filter((p) => {
        const total = p.mailCount + p.smsCount;
        if (countFilter === '0回') return total === 0;
        if (countFilter === '1回以上') return total >= 1;
        if (countFilter === '3回以上') return total >= 3;
        return true;
      });
    }
    return list;
  }, [targets, typeFilter, itemFilter, deadlineFilter, overdueFilter, contactFilter, staffFilter, stateFilter, countFilter]);

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (s.length === filtered.length ? [] : filtered.map((p) => p.id)));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <FilterSelect label="出展者・バイヤー" value={typeFilter} onChange={setTypeFilter} options={['すべて', '出展者', 'バイヤー']} />
        <FilterSelect label="未対応項目" value={itemFilter} onChange={setItemFilter} options={['すべて', ...ITEM_DEFS.map((d) => d.label)]} />
        <FilterSelect label="回答期限" value={deadlineFilter} onChange={setDeadlineFilter} options={['すべて', '今週中', '来週以降', '超過済み']} />
        <FilterSelect label="期限超過の有無" value={overdueFilter} onChange={setOverdueFilter} options={['すべて', '超過のみ', '未超過のみ']} />
        <FilterSelect label="最終連絡日" value={contactFilter} onChange={setContactFilter} options={['すべて', '未連絡', '1週間以内', '1週間より前']} />
        <FilterSelect label="担当者" value={staffFilter} onChange={setStaffFilter} options={['すべて', ...STAFF_LIST]} />
        <FilterSelect label="対応状態" value={stateFilter} onChange={setStateFilter} options={['すべて', ...ACTION_STATE_OPTIONS]} />
        <FilterSelect label="連絡回数" value={countFilter} onChange={setCountFilter} options={['すべて', '0回', '1回以上', '3回以上']} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{selected.length}件選択中 / 全{filtered.length}件</p>
        <button
          disabled={selected.length === 0}
          onClick={() => onOpenCompose(filtered.filter((p) => selected.includes(p.id)))}
          className="btn-primary"
          style={{ opacity: selected.length === 0 ? 0.4 : 1 }}
        >
          リマインド作成
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={selected.length > 0 && selected.length === filtered.length} onChange={toggleAll} /></th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">会社名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">区分</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">担当者名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">未対応項目</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">回答期限</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">期限までの日数</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">最終連絡日時</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">メール回数</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">SMS回数</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">担当者</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">対応状態</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">推奨する次の対応</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const dl = daysLeftLabel(p);
              const items = incompleteItemLabels(p);
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.companyName}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{p.type}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.contactName}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1" style={{ maxWidth: 220 }}>
                      {items.slice(0, 2).map((i) => <Chip key={i}>{i}</Chip>)}
                      {items.length > 2 && <Chip>{`+${items.length - 2}`}</Chip>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.deadline)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-xs ${dl.cls}`}>{dl.text}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">{p.lastContactDate ? fmtDate(p.lastContactDate) : '未連絡'}</td>
                  <td className="px-3 py-2 text-slate-500">{p.mailCount}</td>
                  <td className="px-3 py-2 text-slate-500">{p.smsCount}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.assignedStaff}</td>
                  <td className="px-3 py-2"><ActionBadge state={p.actionState} /></td>
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{suggestedActionFor(p)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={13} className="text-center text-slate-400 py-8">条件に合うリマインド対象者がいません</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button onClick={() => setShowExcluded((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
          {showExcluded ? '除外中の対象者を隠す' : `除外中の対象者を表示(${excluded.length}件)`}
        </button>
        {showExcluded && (
          <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="px-3 py-2 text-left">会社名</th>
                  <th className="px-3 py-2 text-left">区分</th>
                  <th className="px-3 py-2 text-left">未対応項目</th>
                  <th className="px-3 py-2 text-left">回答期限</th>
                  <th className="px-3 py-2 text-left">除外理由</th>
                </tr>
              </thead>
              <tbody>
                {excluded.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.companyName}</td>
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{p.type}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{incompleteItemLabels(p).join('、')}</td>
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{fmtDate(p.deadline)}</td>
                    <td className="px-3 py-2 text-xs"><ActionBadge state={p.excl} /></td>
                  </tr>
                ))}
                {excluded.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-4">除外中の対象者はいません</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   リマインド作成モーダル
   ========================================================================= */

function ComposeModal({ participants, onClose, onAction }) {
  const isSingle = participants.length === 1;
  const initial = isSingle ? buildMessages(participants[0]) : buildGenericTemplate();
  const [subject, setSubject] = useState(initial.subject);
  const [mailBody, setMailBody] = useState(initial.mailBody);
  const [smsBody, setSmsBody] = useState(initial.smsBody);
  const [useMail, setUseMail] = useState(true);
  const [useSms, setUseSms] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [dateInput, setDateInput] = useState('');
  const [memoInput, setMemoInput] = useState('');

  return (
    <Modal title={`リマインド作成(${participants.length}件選択中)`} onClose={onClose} wide>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {participants.map((p) => <Chip key={p.id}>{p.companyName}</Chip>)}
      </div>
      {!isSingle && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
          複数件を選択中のため、差し込み項目はプレースホルダーで表示しています。実際の送信時には各社の情報に自動で置き換わります。
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">メール件名</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">メール本文</label>
          <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} rows={10} className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">SMS本文</label>
          <textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={3} className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={useMail} onChange={(e) => setUseMail(e.target.checked)} /> メールを送信対象に含める</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={useSms} onChange={(e) => setUseSms(e.target.checked)} /> SMSを送信対象に含める</label>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">対応の記録(この段階では実際の送信は行われません)</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { onAction({ type: 'send', useMail, useSms, subject, mailBody, smsBody }); onClose(); }} className="btn-primary">送信済みに変更</button>
          <button onClick={() => { onAction({ type: 'setState', actionState: '送信予定' }); onClose(); }} className="btn-secondary">送信予定に登録</button>
          <button onClick={() => { onAction({ type: 'setState', actionState: '対象除外' }); onClose(); }} className="btn-secondary">送信対象から除外</button>
          <button onClick={() => { onAction({ type: 'setState', actionState: '個別対応中' }); onClose(); }} className="btn-secondary">個別対応中に変更</button>
          <button onClick={() => setPendingAction(pendingAction === 'extend' ? null : 'extend')} className="btn-secondary">期限を延長</button>
          <button onClick={() => setPendingAction(pendingAction === 'nextDate' ? null : 'nextDate')} className="btn-secondary">次回対応日を登録</button>
          <button onClick={() => setPendingAction(pendingAction === 'memo' ? null : 'memo')} className="btn-secondary">対応メモを記録</button>
        </div>
        {pendingAction === 'extend' && (
          <div className="flex items-center gap-2 mt-3">
            <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm" />
            <button onClick={() => { if (!dateInput) return; onAction({ type: 'extend', newDeadline: dateInput }); onClose(); }} className="btn-primary">この期限に延長する</button>
          </div>
        )}
        {pendingAction === 'nextDate' && (
          <div className="flex items-center gap-2 mt-3">
            <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm" />
            <button onClick={() => { if (!dateInput) return; onAction({ type: 'nextDate', date: dateInput }); onClose(); }} className="btn-primary">次回対応日を登録する</button>
          </div>
        )}
        {pendingAction === 'memo' && (
          <div className="flex items-center gap-2 mt-3">
            <input value={memoInput} onChange={(e) => setMemoInput(e.target.value)} placeholder="対応メモを入力" className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm" />
            <button onClick={() => { if (!memoInput.trim()) return; onAction({ type: 'memo', text: memoInput.trim() }); onClose(); }} className="btn-primary">メモを記録する</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================================
   詳細モーダル
   ========================================================================= */

function DetailModal({ participant, history, onClose }) {
  if (!participant) return null;
  const relevantHistory = history.filter((h) => h.company === participant.companyName);
  return (
    <Modal title={`${participant.companyName} の詳細`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div><span className="text-slate-400">区分: </span>{participant.type}</div>
        <div><span className="text-slate-400">担当者: </span>{participant.contactName}</div>
        <div><span className="text-slate-400">メール: </span>{participant.email}</div>
        <div><span className="text-slate-400">携帯電話: </span>{participant.mobile}</div>
        <div><span className="text-slate-400">回答期限: </span>{fmtDate(participant.deadline)}</div>
        <div><span className="text-slate-400">担当事務局員: </span>{participant.assignedStaff}</div>
        <div><span className="text-slate-400">対応状態: </span><ActionBadge state={participant.actionState} /></div>
        <div><span className="text-slate-400">全体進捗率: </span>{calcProgress(participant)}%</div>
      </div>
      <h4 className="text-xs font-bold text-slate-500 mb-2">対応メモ履歴</h4>
      <div className="space-y-2 mb-4">
        {(participant.memos || []).length === 0 && <p className="text-xs text-slate-400">記録された対応メモはありません</p>}
        {(participant.memos || []).map((m, i) => (
          <div key={i} className="text-xs bg-slate-50 border border-slate-200 rounded p-2">
            <span className="text-slate-400">{m.date} / {m.staff}</span>
            <p className="text-slate-600 mt-0.5">{m.text}</p>
          </div>
        ))}
      </div>
      <h4 className="text-xs font-bold text-slate-500 mb-2">連絡履歴</h4>
      <div className="space-y-1">
        {relevantHistory.length === 0 && <p className="text-xs text-slate-400">連絡履歴はありません</p>}
        {relevantHistory.map((h) => (
          <div key={h.id} className="text-xs text-slate-500 flex gap-2 items-start">
            <span className="whitespace-nowrap">{h.datetime}</span>
            <Chip>{h.channel}</Chip>
            <span>{h.content}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* =========================================================================
   リマインド履歴
   ========================================================================= */

function HistoryScreen({ history }) {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('すべて');

  const rows = useMemo(() => {
    let list = [...history].sort((a, b) => b.datetime.localeCompare(a.datetime));
    if (channel !== 'すべて') list = list.filter((h) => h.channel === channel);
    if (search.trim()) list = list.filter((h) => h.company.includes(search.trim()));
    return list;
  }, [history, search, channel]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <label className="flex flex-col text-xs text-slate-500 gap-1">
          会社名で検索
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-md text-sm w-48" />
        </label>
        <FilterSelect label="連絡手段" value={channel} onChange={setChannel} options={['すべて', 'メール', 'SMS', '電話', 'メモ']} />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">日時</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">会社名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">連絡手段</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">件名・内容</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">未対応項目</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">対応した社員</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">送信結果</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">次回対応日</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{h.datetime}</td>
                <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{h.company}</td>
                <td className="px-3 py-2"><Chip>{h.channel}</Chip></td>
                <td className="px-3 py-2 text-slate-600" style={{ maxWidth: 320 }} title={h.content}>{h.content}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{h.items}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{h.staff}</td>
                <td className="px-3 py-2"><span className={h.result === '成功' ? 'text-green-600' : 'text-red-600'}>{h.result}</span></td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{h.next && h.next !== '-' ? fmtDate(h.next) : '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">履歴がありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   面談希望管理
   ========================================================================= */

function MeetingRequestEditor({ company, allBuyers, allExhibitors, products, initialData, onSave, canEdit }) {
  const isExhibitor = company.type === '出展者';
  const [wishes, setWishes] = useState(initialData.wishes || []);
  const [unavailable, setUnavailable] = useState(initialData.unavailable || []);
  const [interestCategories, setInterestCategories] = useState(initialData.interestCategories || []);
  const [notes, setNotes] = useState(initialData.notes || '');

  useEffect(() => {
    setWishes(initialData.wishes || []);
    setUnavailable(initialData.unavailable || []);
    setInterestCategories(initialData.interestCategories || []);
    setNotes(initialData.notes || '');
    // eslint-disable-next-line
  }, [company.id]);

  const partnerList = isExhibitor ? allBuyers : allExhibitors;
  const myProducts = isExhibitor ? products.filter((pr) => pr.companyId === company.id) : null;

  const addWish = () => {
    const nextRank = wishes.length + 1;
    setWishes((w) => [...w, isExhibitor
      ? { id: `w${Date.now()}`, buyerId: '', rank: nextRank, reason: '', productId: '' }
      : { id: `w${Date.now()}`, exhibitorId: '', rank: nextRank, reason: '', productId: '' }]);
  };
  const updateWish = (id, patch) => setWishes((w) => w.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeWish = (id) => setWishes((w) => w.filter((x) => x.id !== id));
  const toggleUnavailable = (id) => setUnavailable((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  const toggleCategory = (cat) => setInterestCategories((c) => (c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]));

  const handleSave = () => {
    onSave(company.id, { wishes, unavailable, ...(isExhibitor ? {} : { interestCategories }), notes });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-slate-600">{isExhibitor ? '希望するバイヤー' : '希望する出展者・商品'}</h4>
          {canEdit && <button onClick={addWish} className="btn-secondary text-xs">＋希望を追加</button>}
        </div>
        <div className="space-y-2">
          {wishes.length === 0 && <p className="text-xs text-slate-400">まだ希望が登録されていません</p>}
          {wishes.map((w) => (
            <div key={w.id} className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                {isExhibitor ? '希望するバイヤー' : '希望する出展者'}
                <select
                  disabled={!canEdit}
                  value={isExhibitor ? w.buyerId : w.exhibitorId}
                  onChange={(e) => updateWish(w.id, isExhibitor ? { buyerId: e.target.value } : { exhibitorId: e.target.value, productId: '' })}
                  className="border border-slate-300 rounded px-2 py-1 text-sm disabled:bg-slate-50"
                >
                  <option value="">選択してください</option>
                  {partnerList.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                希望順位
                <input disabled={!canEdit} type="number" min={1} value={w.rank} onChange={(e) => updateWish(w.id, { rank: Number(e.target.value) || 1 })} className="border border-slate-300 rounded px-2 py-1 text-sm disabled:bg-slate-50" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">
                {isExhibitor ? '紹介したい商品' : '希望する商品'}
                <select disabled={!canEdit} value={w.productId} onChange={(e) => updateWish(w.id, { productId: e.target.value })} className="border border-slate-300 rounded px-2 py-1 text-sm disabled:bg-slate-50">
                  <option value="">選択してください</option>
                  {(isExhibitor ? myProducts : products.filter((pr) => pr.companyId === w.exhibitorId)).map((pr) => <option key={pr.id} value={pr.id}>{pr.productName}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">
                希望理由
                <input disabled={!canEdit} value={w.reason} onChange={(e) => updateWish(w.id, { reason: e.target.value })} className="border border-slate-300 rounded px-2 py-1 text-sm disabled:bg-slate-50" />
              </label>
              {canEdit && <button onClick={() => removeWish(w.id)} className="text-xs text-red-500 col-span-2 text-left">この希望を削除</button>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-600 mb-2">{isExhibitor ? '対応不可バイヤー' : '対応不可出展者'}</h4>
        <div className="flex flex-wrap gap-2">
          {partnerList.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-xs border border-slate-200 rounded px-2 py-1">
              <input type="checkbox" disabled={!canEdit} checked={unavailable.includes(c.id)} onChange={() => toggleUnavailable(c.id)} />
              {c.companyName}
            </label>
          ))}
        </div>
      </div>

      {!isExhibitor && (
        <div>
          <h4 className="text-sm font-bold text-slate-600 mb-2">関心カテゴリー</h4>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 text-xs border border-slate-200 rounded px-2 py-1">
                <input type="checkbox" disabled={!canEdit} checked={interestCategories.includes(cat)} onChange={() => toggleCategory(cat)} />
                {cat}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-slate-600 mb-2">{isExhibitor ? '面談時の伝達事項' : '商談時の確認事項'}</h4>
        <textarea disabled={!canEdit} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
      </div>

      {canEdit && <button onClick={handleSave} className="btn-primary">保存する</button>}
    </div>
  );
}

function MeetingRequestScreen({ participants, products, meetingRequests, onSaveMeetingRequest, canEdit }) {
  const [typeFilter, setTypeFilter] = useState('すべて');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const list = useMemo(() => {
    let l = participants.filter((p) => p.actionState !== '参加辞退');
    if (typeFilter !== 'すべて') l = l.filter((p) => p.type === typeFilter);
    if (search.trim()) l = l.filter((p) => p.companyName.includes(search.trim()));
    return l;
  }, [participants, typeFilter, search]);

  const selected = participants.find((p) => p.id === selectedId) || list[0] || null;
  const allExhibitors = participants.filter((p) => p.type === '出展者');
  const allBuyers = participants.filter((p) => p.type === 'バイヤー');

  return (
    <div className="flex gap-4" style={{ minHeight: 500 }}>
      <div className="w-72 shrink-0 bg-white rounded-lg border border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="会社名で検索" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <FilterSelect label="区分" value={typeFilter} onChange={setTypeFilter} options={['すべて', '出展者', 'バイヤー']} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map((p) => {
            const mr = meetingRequests[p.id];
            const count = mr ? mr.wishes.length : 0;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between gap-2"
                style={{ backgroundColor: selected && selected.id === p.id ? '#EFF6FF' : 'transparent' }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{p.companyName}</div>
                  <div className="text-xs text-slate-400">{p.type} ・ 希望{count}件</div>
                </div>
                {count > 0 ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-lg border border-slate-200 p-5 overflow-y-auto">
        {selected ? (
          <>
            <h3 className="font-bold text-slate-800 mb-1">{selected.companyName}</h3>
            <p className="text-xs text-slate-400 mb-4">{selected.id} / {selected.type}</p>
            <MeetingRequestEditor
              key={selected.id}
              company={selected}
              allBuyers={allBuyers}
              allExhibitors={allExhibitors}
              products={products}
              initialData={meetingRequests[selected.id] || emptyMeetingRequest(selected.type)}
              onSave={onSaveMeetingRequest}
              canEdit={canEdit}
            />
          </>
        ) : <p className="text-sm text-slate-400">左の一覧から会社を選択してください</p>}
      </div>
    </div>
  );
}

/* =========================================================================
   マッチング候補一覧
   ========================================================================= */

function AddCandidateModal({ exhibitors, buyers, products, onClose, onAdd }) {
  const [exhibitorId, setExhibitorId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [productId, setProductId] = useState('');
  const myProducts = products.filter((pr) => pr.companyId === exhibitorId);
  return (
    <Modal title="マッチング候補を手動で追加" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="flex flex-col gap-1 text-xs text-slate-500">出展者
          <select value={exhibitorId} onChange={(e) => { setExhibitorId(e.target.value); setProductId(''); }} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">選択してください</option>
            {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.companyName}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">バイヤー
          <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">選択してください</option>
            {buyers.map((b) => <option key={b.id} value={b.id}>{b.companyName}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">商品
          <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!exhibitorId} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50">
            <option value="">選択してください</option>
            {myProducts.map((pr) => <option key={pr.id} value={pr.id}>{pr.productName}</option>)}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-4">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={() => { if (!exhibitorId || !buyerId) return; onAdd(exhibitorId, buyerId, productId); onClose(); }} className="btn-primary">追加する</button>
      </div>
    </Modal>
  );
}

function ScoreDetailModal({ candidate, exhibitorName, buyerName, onClose }) {
  return (
    <Modal title="マッチングスコアの内訳" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-3">{exhibitorName} × {buyerName}</p>
      <div className="space-y-2 mb-4">
        {candidate.factors.length === 0 && <p className="text-xs text-slate-400">加点対象の条件はありません(担当者による手動追加)</p>}
        {candidate.factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5">
            <span className="text-slate-600">{f.label}</span>
            <span className="font-semibold text-slate-700">+{f.points}点</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm font-bold border-t border-slate-200 pt-2">
        <span>合計スコア</span>
        <span style={{ color: COLOR.blue }}>{candidate.score}点 / 100点</span>
      </div>
      {candidate.cautions.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-2">
          {candidate.cautions.map((c, i) => <p key={i} className="text-xs text-amber-700">・{c}</p>)}
        </div>
      )}
    </Modal>
  );
}

function MemoModal({ initialText, onClose, onSave }) {
  const [text, setText] = useState(initialText || '');
  return (
    <Modal title="管理者メモ" onClose={onClose}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="このマッチング候補についてのメモを入力してください" />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-3">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={() => { onSave(text); onClose(); }} className="btn-primary">保存する</button>
      </div>
    </Modal>
  );
}

function MatchingScreen({ participants, products, candidates, priorityOrderList, moveCandidate, candidateMeta, setCandidateStatus, setCandidateMemo, addManualCandidate, meetingCounts, canEdit }) {
  const exhibitors = participants.filter((p) => p.type === '出展者');
  const buyers = participants.filter((p) => p.type === 'バイヤー');
  const [categoryFilter, setCategoryFilter] = useState('すべて');
  const [statusFilter, setStatusFilter] = useState('すべて');
  const [exhibitorFilter, setExhibitorFilter] = useState('すべて');
  const [buyerFilter, setBuyerFilter] = useState('すべて');
  const [scoreFilter, setScoreFilter] = useState('すべて');
  const [showAddModal, setShowAddModal] = useState(false);
  const [memoEditingId, setMemoEditingId] = useState(null);
  const [scoreDetailId, setScoreDetailId] = useState(null);

  const companyOf = (id) => participants.find((p) => p.id === id);
  const productName = (id) => { const p = products.find((pr) => pr.id === id); return p ? p.productName : '-'; };

  const rows = useMemo(() => {
    let list = candidates.map((c) => ({
      ...c,
      _status: (candidateMeta[c.id] && candidateMeta[c.id].status) || (c.category === '対応不可' ? '除外' : '保留'),
      _memo: (candidateMeta[c.id] && candidateMeta[c.id].memo) || '',
      _priority: priorityOrderList.indexOf(c.id) + 1,
    }));
    if (categoryFilter !== 'すべて') list = list.filter((c) => c.category === categoryFilter);
    if (statusFilter !== 'すべて') list = list.filter((c) => c._status === statusFilter);
    if (exhibitorFilter !== 'すべて') list = list.filter((c) => c.exhibitorId === exhibitorFilter);
    if (buyerFilter !== 'すべて') list = list.filter((c) => c.buyerId === buyerFilter);
    if (scoreFilter !== 'すべて') {
      list = list.filter((c) => {
        if (scoreFilter === '70点以上') return c.score >= 70;
        if (scoreFilter === '40〜69点') return c.score >= 40 && c.score <= 69;
        return c.score <= 39;
      });
    }
    list.sort((a, b) => a._priority - b._priority);
    return list;
  }, [candidates, candidateMeta, priorityOrderList, categoryFilter, statusFilter, exhibitorFilter, buyerFilter, scoreFilter]);

  const scoreDetailCandidate = scoreDetailId ? rows.find((c) => c.id === scoreDetailId) || candidates.find((c) => c.id === scoreDetailId) : null;
  const memoEditingCandidate = memoEditingId ? rows.find((c) => c.id === memoEditingId) || candidates.find((c) => c.id === memoEditingId) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <FilterSelect label="マッチング区分" value={categoryFilter} onChange={setCategoryFilter} options={['すべて', '相互希望', 'バイヤー希望', '出展者希望', 'システム推奨', '対応不可']} />
        <FilterSelect label="採用状態" value={statusFilter} onChange={setStatusFilter} options={['すべて', '採用', '保留', '除外']} />
        <label className="flex flex-col text-xs text-slate-500 gap-1">出展者
          <select value={exhibitorFilter} onChange={(e) => setExhibitorFilter(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
            <option value="すべて">すべて</option>
            {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.companyName}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-500 gap-1">バイヤー
          <select value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
            <option value="すべて">すべて</option>
            {buyers.map((b) => <option key={b.id} value={b.id}>{b.companyName}</option>)}
          </select>
        </label>
        <FilterSelect label="スコア" value={scoreFilter} onChange={setScoreFilter} options={['すべて', '70点以上', '40〜69点', '39点以下']} />
        <div className="flex-1" />
        {canEdit && <button onClick={() => setShowAddModal(true)} className="btn-primary">＋マッチング追加</button>}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">優先順位</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">バイヤー名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">出展者名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">商品名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">区分</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">双方の希望順位</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">スコア</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">推薦理由</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">対応可能時間</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">注意事項</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">採用状態</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const ex = companyOf(c.exhibitorId);
              const by = companyOf(c.buyerId);
              const exCapped = (meetingCounts[c.exhibitorId] || 0) >= MAX_MEETINGS_PER_COMPANY;
              const byCapped = (meetingCounts[c.buyerId] || 0) >= MAX_MEETINGS_PER_COMPANY;
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-600">{c._priority}</span>
                      {canEdit && (
                        <>
                          <button onClick={() => moveCandidate(c.id, -1)} className="text-slate-300 hover:text-slate-500"><ChevronUp size={13} /></button>
                          <button onClick={() => moveCandidate(c.id, 1)} className="text-slate-300 hover:text-slate-500"><ChevronDown size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{by ? by.companyName : c.buyerId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{ex ? ex.companyName : c.exhibitorId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{productName(c.productId)}</td>
                  <td className="px-3 py-2"><MatchCategoryBadge category={c.category} /></td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    出展:{c.exhibitorRank ? `第${c.exhibitorRank}希望` : '-'}<br />
                    バイヤー:{c.buyerRank ? `第${c.buyerRank}希望` : '-'}
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{c.score}点</td>
                  <td className="px-3 py-2 text-xs text-slate-600" style={{ maxWidth: 240 }}>
                    <div>{c.factors.map((f) => f.label).join('、') || '担当者による手動追加'}</div>
                    <button onClick={() => setScoreDetailId(c.id)} className="text-xs underline" style={{ color: COLOR.blue }}>スコア内訳を見る</button>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    出展:{ex ? ex.availableTime : '-'}<br />バイヤー:{by ? by.visitTime : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ maxWidth: 200 }}>
                    {c.cautions.map((ct, i) => <div key={i} className="text-amber-600">・{ct}</div>)}
                    {exCapped && <div className="text-red-500">・出展者側の面談上限({MAX_MEETINGS_PER_COMPANY}件)に達しています</div>}
                    {byCapped && <div className="text-red-500">・バイヤー側の面談上限({MAX_MEETINGS_PER_COMPANY}件)に達しています</div>}
                    {c.cautions.length === 0 && !exCapped && !byCapped && <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {['採用', '保留', '除外'].map((s) => (
                        <button
                          key={s}
                          disabled={!canEdit}
                          onClick={() => setCandidateStatus(c.id, s)}
                          className="px-2 py-0.5 rounded text-xs font-medium border"
                          style={{
                            backgroundColor: c._status === s ? (s === '採用' ? '#DCFCE7' : s === '保留' ? '#FEF3C7' : '#F1F5F9') : '#fff',
                            color: c._status === s ? (s === '採用' ? '#166534' : s === '保留' ? '#92400E' : '#64748B') : '#94A3B8',
                            borderColor: c._status === s ? 'transparent' : '#E2E8F0',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setMemoEditingId(c.id)} className="text-xs" style={{ color: COLOR.blue }}>メモ{c._memo ? '(あり)' : ''}</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={12} className="text-center text-slate-400 py-8">条件に合うマッチング候補がありません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{rows.length}件を表示中</p>

      {showAddModal && (
        <AddCandidateModal
          exhibitors={exhibitors}
          buyers={buyers}
          products={products}
          onClose={() => setShowAddModal(false)}
          onAdd={addManualCandidate}
        />
      )}
      {scoreDetailCandidate && (
        <ScoreDetailModal
          candidate={scoreDetailCandidate}
          exhibitorName={(companyOf(scoreDetailCandidate.exhibitorId) || {}).companyName || scoreDetailCandidate.exhibitorId}
          buyerName={(companyOf(scoreDetailCandidate.buyerId) || {}).companyName || scoreDetailCandidate.buyerId}
          onClose={() => setScoreDetailId(null)}
        />
      )}
      {memoEditingCandidate && (
        <MemoModal
          initialText={memoEditingCandidate._memo}
          onClose={() => setMemoEditingId(null)}
          onSave={(text) => setCandidateMemo(memoEditingId, text)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   タイムスケジュール調整
   ========================================================================= */

const SCHEDULE_STATUS_STYLE = {
  '作成中': 'bg-gray-100 text-gray-600 border-gray-300',
  '仮確定': 'bg-amber-50 text-amber-700 border-amber-300',
  '確定': 'bg-green-50 text-green-700 border-green-300',
};

function ScheduleStatusBadge({ status }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${SCHEDULE_STATUS_STYLE[status] || ''}`}>{status}</span>;
}

function ScheduleSettingsPanel({ settings, onSave, canEdit }) {
  const [form, setForm] = useState(settings);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const numKeys = ['meetingDuration', 'changeoverDuration', 'tableCount', 'maxMeetingsPerBuyer', 'maxMeetingsPerExhibitor', 'maxConsecutiveMeetings'];
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      <h3 className="text-sm font-bold text-slate-600 mb-3">スケジュール設定</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500">開催日
          <input type="date" disabled={!canEdit} value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">開始時間
          <input type="time" disabled={!canEdit} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">終了時間
          <input type="time" disabled={!canEdit} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">1商談の時間(分)
          <input type="number" disabled={!canEdit} value={form.meetingDuration} onChange={(e) => set('meetingDuration', Number(e.target.value) || 0)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">入替時間(分)
          <input type="number" disabled={!canEdit} value={form.changeoverDuration} onChange={(e) => set('changeoverDuration', Number(e.target.value) || 0)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">休憩開始
          <input type="time" disabled={!canEdit} value={form.breakStart} onChange={(e) => set('breakStart', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">休憩終了
          <input type="time" disabled={!canEdit} value={form.breakEnd} onChange={(e) => set('breakEnd', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">テーブル数
          <input type="number" disabled={!canEdit} value={form.tableCount} onChange={(e) => set('tableCount', Number(e.target.value) || 1)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">バイヤーの面談数上限
          <input type="number" disabled={!canEdit} value={form.maxMeetingsPerBuyer} onChange={(e) => set('maxMeetingsPerBuyer', Number(e.target.value) || 1)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">出展者の面談数上限
          <input type="number" disabled={!canEdit} value={form.maxMeetingsPerExhibitor} onChange={(e) => set('maxMeetingsPerExhibitor', Number(e.target.value) || 1)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">連続面談数の上限
          <input type="number" disabled={!canEdit} value={form.maxConsecutiveMeetings} onChange={(e) => set('maxConsecutiveMeetings', Number(e.target.value) || 1)} className="border border-slate-300 rounded px-2 py-1.5 text-sm disabled:bg-slate-50" />
        </label>
      </div>
      {canEdit && <button onClick={() => onSave(form, false)} className="btn-secondary">設定を保存する(配置は変更しません)</button>}
    </div>
  );
}

function ScheduleItemFormFields({ form, set, participants, products, slots }) {
  const buyers = participants.filter((p) => p.type === 'バイヤー' && p.actionState !== '参加辞退');
  const exhibitors = participants.filter((p) => p.type === '出展者' && p.actionState !== '参加辞退');
  const myProducts = products.filter((pr) => pr.companyId === form.exhibitorId);
  return (
    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      <label className="flex flex-col gap-1 text-xs text-slate-500">時間
        <select value={form.slotIndex} onChange={(e) => set('slotIndex', Number(e.target.value))} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
          {slots.map((s) => <option key={s.index} value={s.index}>{s.start}〜{s.end}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">テーブル番号
        <select value={form.table} onChange={(e) => set('table', Number(e.target.value))} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((t) => <option key={t} value={t}>{`テーブル${t}`}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">バイヤー
        <select value={form.buyerId} onChange={(e) => set('buyerId', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">選択してください</option>
          {buyers.map((b) => <option key={b.id} value={b.id}>{b.companyName}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">出展者
        <select value={form.exhibitorId} onChange={(e) => set('exhibitorId', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">選択してください</option>
          {exhibitors.map((e) => <option key={e.id} value={e.id}>{e.companyName}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500 col-span-2">商品
        <select value={form.productId || ''} onChange={(e) => set('productId', e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">選択してください</option>
          {myProducts.map((pr) => <option key={pr.id} value={pr.id}>{pr.productName}</option>)}
        </select>
      </label>
    </div>
  );
}

function ScheduleItemEditModal({ item, participants, products, slots, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ buyerId: item.buyerId, exhibitorId: item.exhibitorId, productId: item.productId, slotIndex: item.slotIndex, table: item.table });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const slot = slots.find((s) => s.index === Number(form.slotIndex));
    onSave(item.id, { buyerId: form.buyerId, exhibitorId: form.exhibitorId, productId: form.productId, slotIndex: Number(form.slotIndex), start: slot.start, end: slot.end, table: Number(form.table) });
    onClose();
  };

  return (
    <Modal title="面談の編集" onClose={onClose}>
      <ScheduleItemFormFields form={form} set={set} participants={participants} products={products} slots={slots} />
      <div className="border-t border-slate-200 pt-3 mb-3">
        <p className="text-xs font-semibold text-slate-500 mb-2">確認状態</p>
        <div className="flex gap-2">
          <button onClick={() => { onSave(item.id, { status: '作成中' }); onClose(); }} className="btn-secondary">作成中に戻す</button>
          <button onClick={() => { onSave(item.id, { status: '仮確定' }); onClose(); }} className="btn-secondary">仮確定にする</button>
          <button onClick={() => { onSave(item.id, { status: '確定' }); onClose(); }} className="btn-secondary">確定にする</button>
        </div>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-3">
        <button onClick={() => { onDelete(item.id); onClose(); }} className="text-xs text-red-500">この面談を削除</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={handleSave} className="btn-primary">保存する</button>
        </div>
      </div>
    </Modal>
  );
}

function AddScheduleModal({ buyerId, slotIndex, participants, products, slots, onAdd, onClose }) {
  const [form, setForm] = useState({ buyerId: buyerId || '', exhibitorId: '', productId: '', slotIndex: slotIndex != null ? slotIndex : (slots[0] ? slots[0].index : 0), table: 1 });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleAdd = () => {
    if (!form.buyerId || !form.exhibitorId) return;
    const slot = slots.find((s) => s.index === Number(form.slotIndex));
    onAdd({ buyerId: form.buyerId, exhibitorId: form.exhibitorId, productId: form.productId, slotIndex: Number(form.slotIndex), start: slot.start, end: slot.end, table: Number(form.table), category: 'システム推奨', score: 0, factors: [], exhibitorRank: null, buyerRank: null, candidateId: null });
    onClose();
  };

  return (
    <Modal title="面談を新規追加" onClose={onClose}>
      <ScheduleItemFormFields form={form} set={set} participants={participants} products={products} slots={slots} />
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
        マッチング候補に基づかない追加のため、「未確定のマッチング」の注意表示が付きます。マッチング候補一覧で先に採用しておくと警告を避けられます。
      </p>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={handleAdd} className="btn-primary">追加する</button>
      </div>
    </Modal>
  );
}

function MeetingCard({ item, exhibitor, buyer, product, warnings, onClick }) {
  const hasWarning = warnings.length > 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border p-1.5"
      style={{ borderColor: hasWarning ? '#FCA5A5' : '#E2E8F0', backgroundColor: hasWarning ? '#FEF2F2' : '#F8FAFC' }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold text-slate-700 truncate">{exhibitor ? exhibitor.companyName : item.exhibitorId}</span>
        {hasWarning && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
      </div>
      <div className="text-xs text-slate-500 truncate">{product ? product.productName : '-'}</div>
      <div className="mt-1"><MatchCategoryBadge category={item.category} /></div>
      <div className="text-xs text-slate-400 mt-0.5 truncate">
        {item.exhibitorRank ? `出展第${item.exhibitorRank}希望` : ''}{item.buyerRank ? ` / バイヤー第${item.buyerRank}希望` : ''}{(item.exhibitorRank || item.buyerRank) ? ' ・ ' : ''}{item.score}点 ・ T{item.table}
      </div>
      <div className="mt-1"><ScheduleStatusBadge status={item.status} /></div>
    </button>
  );
}

function ConfirmationPanel({ companies, confirmations, onChange, canEdit }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-600 mb-3">出展者・バイヤーの確認状況</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {companies.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-slate-700">{c.companyName}</span>
              <span className="text-xs text-slate-400 ml-1">({c.type})</span>
            </div>
            <select
              disabled={!canEdit}
              value={confirmations[c.id] || '未確認'}
              onChange={(e) => onChange(c.id, e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 disabled:bg-slate-50"
            >
              <option value="未確認">未確認</option>
              <option value="承認">承認</option>
              <option value="修正希望">修正希望</option>
            </select>
          </div>
        ))}
        {companies.length === 0 && <p className="text-xs text-slate-400">まだ面談が配置されている会社がありません</p>}
      </div>
    </div>
  );
}

function ScheduleScreen({
  participants, products, meetingRequests, candidateMeta, scheduleSettings, scheduleItems, scheduleConfirmations,
  onSaveSettings, onRunAutoSchedule, onUpdateItem, onDeleteItem, onAddItem, onChangeConfirmation, unplacedInfo, canEdit,
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [addContext, setAddContext] = useState(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showConfirmations, setShowConfirmations] = useState(false);
  const [showUnplaced, setShowUnplaced] = useState(false);

  const buyers = participants.filter((p) => p.type === 'バイヤー' && p.actionState !== '参加辞退');
  const exhibitorOf = (id) => participants.find((p) => p.id === id);
  const productOf = (id) => products.find((p) => p.id === id);

  const slots = useMemo(() => generateTimeSlots(scheduleSettings), [scheduleSettings]);
  const warningsById = useMemo(() => {
    const map = {};
    scheduleItems.forEach((it) => { map[it.id] = computeScheduleWarnings(it, scheduleItems, participants, meetingRequests, scheduleSettings, candidateMeta, slots); });
    return map;
  }, [scheduleItems, participants, meetingRequests, scheduleSettings, candidateMeta, slots]);

  const scheduledCompanyIds = useMemo(() => {
    const ids = new Set();
    scheduleItems.forEach((it) => { ids.add(it.buyerId); ids.add(it.exhibitorId); });
    return participants.filter((p) => ids.has(p.id));
  }, [scheduleItems, participants]);

  const totalWarnings = Object.values(warningsById).reduce((s, w) => s + w.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <button onClick={() => setShowSettings((s) => !s)} className="text-xs font-semibold underline">{showSettings ? '設定を隠す' : 'スケジュール設定を表示'}</button>
          <span>開催日: {fmtDate(scheduleSettings.eventDate)} ／ 配置済み{scheduleItems.length}件 ／ 警告{totalWarnings}件</span>
        </div>
        {canEdit && <button onClick={onRunAutoSchedule} className="btn-primary">自動配置を実行(上書き)</button>}
      </div>

      {showSettings && <ScheduleSettingsPanel settings={scheduleSettings} onSave={onSaveSettings} canEdit={canEdit} />}

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto mb-4">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600" style={{ width: 90 }}>時間</th>
              {buyers.map((b) => <th key={b.id} className="px-2 py-2 text-left text-xs font-semibold text-slate-600">{b.companyName}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => {
              const prevSlot = slots[i - 1];
              const showBreakDivider = prevSlot && prevSlot.segment !== slot.segment;
              return (
                <React.Fragment key={slot.index}>
                  {showBreakDivider && (
                    <tr>
                      <td colSpan={buyers.length + 1} className="px-2 py-1.5 text-center text-xs text-slate-400 bg-slate-50">
                        休憩時間({scheduleSettings.breakStart}〜{scheduleSettings.breakEnd})
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-100">
                    <td className="px-2 py-2 text-xs text-slate-500 align-top whitespace-nowrap">{slot.start}〜{slot.end}</td>
                    {buyers.map((b) => {
                      const item = scheduleItems.find((it) => it.buyerId === b.id && it.slotIndex === slot.index);
                      return (
                        <td key={b.id} className="px-1.5 py-1.5 align-top">
                          {item ? (
                            <MeetingCard
                              item={item}
                              exhibitor={exhibitorOf(item.exhibitorId)}
                              buyer={b}
                              product={productOf(item.productId)}
                              warnings={warningsById[item.id] || []}
                              onClick={() => canEdit && setEditingItem(item)}
                            />
                          ) : (
                            canEdit && (
                              <button
                                onClick={() => setAddContext({ buyerId: b.id, slotIndex: slot.index })}
                                className="w-full h-full text-slate-300 hover:text-slate-500 border border-dashed border-slate-200 rounded-lg py-3 text-xs"
                              >
                                ＋ 追加
                              </button>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <div>
          <button onClick={() => setShowUnplaced((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
            {showUnplaced ? '未配置の候補を隠す' : `未配置の候補を表示(${unplacedInfo.length}件)`}
          </button>
          {showUnplaced && (
            <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 p-3">
              {unplacedInfo.length === 0 && <p className="text-xs text-slate-400">未配置の候補はありません</p>}
              {unplacedInfo.map((u, i) => {
                const ex = exhibitorOf(u.exhibitorId);
                const by = exhibitorOf(u.buyerId);
                return (
                  <div key={i} className="text-xs text-slate-500 border-b border-slate-200 py-1.5 last:border-0">
                    {ex ? ex.companyName : u.exhibitorId} × {by ? by.companyName : u.buyerId} ・ <span className="text-amber-600">{u.reason}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setShowConfirmations((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
            {showConfirmations ? '確認状況を隠す' : '出展者・バイヤーの確認状況を表示'}
          </button>
          {showConfirmations && (
            <div className="mt-2">
              <ConfirmationPanel companies={scheduledCompanyIds} confirmations={scheduleConfirmations} onChange={onChangeConfirmation} canEdit={canEdit} />
            </div>
          )}
        </div>
      </div>

      {editingItem && (
        <ScheduleItemEditModal
          item={editingItem}
          participants={participants}
          products={products}
          slots={slots}
          onSave={onUpdateItem}
          onDelete={onDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {addContext && (
        <AddScheduleModal
          buyerId={addContext.buyerId}
          slotIndex={addContext.slotIndex}
          participants={participants}
          products={products}
          slots={slots}
          onAdd={onAddItem}
          onClose={() => setAddContext(null)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   SMSリマインド管理
   ========================================================================= */

const SMS_JOB_STATUS_STYLE = {
  '下書き': 'bg-gray-100 text-gray-600 border-gray-300',
  '承認待ち': 'bg-amber-50 text-amber-700 border-amber-300',
  '予約済み': 'bg-blue-50 text-blue-700 border-blue-200',
  '条件待ち': 'bg-purple-50 text-purple-700 border-purple-300',
  '送信済み': 'bg-green-50 text-green-700 border-green-300',
  '送信失敗': 'bg-red-50 text-red-700 border-red-300',
  '除外': 'bg-slate-100 text-slate-400 border-slate-200',
};
function SmsJobStatusBadge({ status }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${SMS_JOB_STATUS_STYLE[status] || ''}`}>{status}</span>;
}

function SmsComposeModal({ participants, onClose, onCreateJobs }) {
  const isSingle = participants.length === 1;
  const [body, setBody] = useState(isSingle ? buildSmsBody(participants[0], `${SMS_URL_BASE}/(発行後に決定)`) : buildGenericSmsBody());
  const [mode, setMode] = useState('管理者承認後に送信');
  const [scheduledAt, setScheduledAt] = useState('');
  const [conditionNote, setConditionNote] = useState('');

  const handleCreate = () => {
    if (mode === '予約送信' && !scheduledAt) return;
    onCreateJobs(participants.map((p) => p.id), body, mode, { scheduledAt: scheduledAt || null, conditionNote: conditionNote || null });
    onClose();
  };

  return (
    <Modal title={`SMS作成(${participants.length}件選択中)`} onClose={onClose}>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {participants.map((p) => <Chip key={p.id}>{p.companyName}</Chip>)}
      </div>
      {!isSingle && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
          複数件を選択中のため、差し込み項目はプレースホルダーで表示しています。登録時に各社・専用URLへ自動的に置き換わります。
        </p>
      )}
      <label className="text-xs font-semibold text-slate-500">SMS本文</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
      <p className="text-xs text-slate-400 mt-1 mb-3">{body.length}文字{isSingle ? '(専用URL発行後に文字数が変わる場合があります)' : ''}</p>

      <label className="text-xs font-semibold text-slate-500">送信方法</label>
      <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm mb-3">
        {SMS_SEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      {mode === '予約送信' && (
        <label className="flex flex-col gap-1 text-xs text-slate-500 mb-3">
          予約日時
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
      )}
      {mode === '条件付き自動送信' && (
        <label className="flex flex-col gap-1 text-xs text-slate-500 mb-3">
          自動送信の条件(メモ)
          <input value={conditionNote} onChange={(e) => setConditionNote(e.target.value)} placeholder="例:7/9時点で未回答の場合に送信" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </label>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-2">
        <button onClick={onClose} className="btn-secondary">キャンセル</button>
        <button onClick={handleCreate} className="btn-primary">この内容で登録する</button>
      </div>
    </Modal>
  );
}

function SmsScreen({
  participants, history, smsJobs, smsUrlTokens, onCreateJobs, onExecuteJob, onExcludeJob,
  onSetConsent, onToggleBlocked, onSimulateAccess, onSimulateComplete, canEdit,
}) {
  const [selected, setSelected] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [showProcessing, setShowProcessing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [typeFilter, setTypeFilter] = useState('すべて');

  const companyOf = (id) => participants.find((p) => p.id === id);

  const activeJobFor = (companyId) => smsJobs.find((j) => j.companyId === companyId && ['下書き', '承認待ち', '予約済み', '条件待ち'].includes(j.status));

  const { candidates, excluded } = useMemo(() => {
    const cands = [];
    const excl = [];
    participants.forEach((p) => {
      const reasons = computeSmsReasons(p);
      if (reasons.length === 0) return;
      if (activeJobFor(p.id)) return;
      const reason = computeSmsExclusionReason(p, history);
      if (reason) excl.push({ ...p, reasons, reason });
      else cands.push({ ...p, reasons });
    });
    return { candidates: cands, excluded: excl };
    // eslint-disable-next-line
  }, [participants, history, smsJobs]);

  const filtered = useMemo(() => (typeFilter === 'すべて' ? candidates : candidates.filter((p) => p.type === typeFilter)), [candidates, typeFilter]);

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (s.length === filtered.length ? [] : filtered.map((p) => p.id)));

  const processingJobs = smsJobs.filter((j) => ['下書き', '承認待ち', '予約済み', '条件待ち'].includes(j.status));
  const historyEntries = [...history].filter((h) => h.channel === 'SMS').sort((a, b) => b.datetime.localeCompare(a.datetime));

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg px-3 py-2 mb-4">
        試作段階では実際の携帯電話網へは配信されません。送信操作を押すと、成功・失敗を模擬的に表示します(将来的に国内SMS配信サービスのAPIに接続する想定のデータ構造です)。
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200">
        <FilterSelect label="出展者・バイヤー" value={typeFilter} onChange={setTypeFilter} options={['すべて', '出展者', 'バイヤー']} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{selected.length}件選択中 / 全{filtered.length}件</p>
        {canEdit && (
          <button disabled={selected.length === 0} onClick={() => setComposeOpen(true)} className="btn-primary" style={{ opacity: selected.length === 0 ? 0.4 : 1 }}>
            SMS作成
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={selected.length > 0 && selected.length === filtered.length} onChange={toggleAll} /></th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">会社名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">担当者名</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">携帯電話番号</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">区分</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">未対応項目</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">回答期限</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">最終メール送信日</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">最終SMS送信日</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">SMS送信回数</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">同意状態</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">送信可否</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const lastMail = findLastHistoryDate(history, p.companyName, 'メール');
              const lastSms = findLastHistoryDate(history, p.companyName, 'SMS');
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{p.companyName}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.contactName}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{maskMobile(p.mobile)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{p.type}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1" style={{ maxWidth: 200 }}>
                      {p.reasons.slice(0, 2).map((r) => <Chip key={r.code}>{r.label}</Chip>)}
                      {p.reasons.length > 2 && <Chip>{`+${p.reasons.length - 2}`}</Chip>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.deadline)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{lastMail ? fmtDate(lastMail.slice(0, 10)) : '未送信'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{lastSms ? fmtDate(lastSms.slice(0, 10)) : '未送信'}</td>
                  <td className="px-3 py-2 text-slate-500">{p.smsCount || 0}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {canEdit ? (
                      <select value={p.smsConsent} onChange={(e) => onSetConsent(p.id, e.target.value)} className="border border-slate-300 rounded px-1 py-0.5 text-xs">
                        {SMS_CONSENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : p.smsConsent}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap"><span className="text-green-600 font-semibold">送信可</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {canEdit && <button onClick={() => onToggleBlocked(p.id)} className="text-xs text-slate-400">送信停止にする</button>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={13} className="text-center text-slate-400 py-8">条件に合うSMS送信候補がいません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{filtered.length}件を表示中</p>

      <div className="mt-4">
        <button onClick={() => setShowExcluded((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
          {showExcluded ? '対象外の会社を隠す' : `対象外の会社を表示(${excluded.length}件)`}
        </button>
        {showExcluded && (
          <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="px-3 py-2 text-left">会社名</th>
                  <th className="px-3 py-2 text-left">区分</th>
                  <th className="px-3 py-2 text-left">対象外の理由</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {excluded.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.companyName}</td>
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{p.type}</td>
                    <td className="px-3 py-2 text-xs text-red-500">{p.reason}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {canEdit && p.reason === '管理者による送信停止' && <button onClick={() => onToggleBlocked(p.id)} className="text-xs" style={{ color: COLOR.blue }}>停止を解除</button>}
                    </td>
                  </tr>
                ))}
                {excluded.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-4">対象外の会社はいません</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button onClick={() => setShowProcessing((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
          {showProcessing ? '処理中のSMSを隠す' : `処理中のSMSを表示(${processingJobs.length}件)`}
        </button>
        {showProcessing && (
          <div className="mt-2 bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">会社名</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">状態</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">本文</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">予約/条件</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {processingJobs.map((j) => {
                  const p = companyOf(j.companyId);
                  return (
                    <tr key={j.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{p ? p.companyName : j.companyId}</td>
                      <td className="px-3 py-2"><SmsJobStatusBadge status={j.status} /></td>
                      <td className="px-3 py-2 text-xs text-slate-500" style={{ maxWidth: 280 }} title={j.body}>{j.body.slice(0, 40)}…({j.charCount || j.body.length}文字)</td>
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {j.status === '予約済み' && `予約: ${j.scheduledAt}`}
                        {j.status === '条件待ち' && `条件: ${j.conditionNote || '-'}`}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {canEdit && (
                          <div className="flex gap-2">
                            {j.status === '承認待ち' && <button onClick={() => onExecuteJob(j.id)} className="text-xs font-semibold" style={{ color: COLOR.blue }}>承認して送信</button>}
                            {j.status === '予約済み' && <button onClick={() => onExecuteJob(j.id)} className="text-xs font-semibold" style={{ color: COLOR.blue }}>今すぐ配信</button>}
                            {j.status === '条件待ち' && <button onClick={() => onExecuteJob(j.id)} className="text-xs font-semibold" style={{ color: COLOR.blue }}>条件を確認して配信</button>}
                            {j.status === '下書き' && <button onClick={() => onExecuteJob(j.id)} className="text-xs font-semibold" style={{ color: COLOR.blue }}>承認待ちにして送信</button>}
                            <button onClick={() => onExcludeJob(j.id)} className="text-xs text-red-500">除外</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {processingJobs.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-4">処理中のSMSはありません</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button onClick={() => setShowHistory((s) => !s)} className="text-xs font-semibold text-slate-500 underline">
          {showHistory ? 'SMS送信履歴を隠す' : `SMS送信履歴を表示(${historyEntries.length}件)`}
        </button>
        {showHistory && (
          <div className="mt-2 bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">送信日時</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">送信先</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">本文</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">送信理由</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">送信者/承認者</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">外部サービス</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">外部メッセージID</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">配信結果</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">エラー理由</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">専用URL状態</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">アクセス/完了日時</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-600">想定費用</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries.map((h) => {
                  const token = h.urlToken ? smsUrlTokens[h.urlToken] : null;
                  const accessedAt = h.urlAccessedAt || (token && token.accessedAt);
                  const completedAt = h.urlCompletedAt || (token && token.completedAt);
                  return (
                    <tr key={h.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{h.datetime}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap font-medium text-slate-700">{h.company}</td>
                      <td className="px-2 py-1.5 text-slate-600" style={{ maxWidth: 220 }} title={h.content}>{h.content.slice(0, 30)}…</td>
                      <td className="px-2 py-1.5 text-slate-400" style={{ maxWidth: 140 }}>{h.sendReason || '-'}</td>
                      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{h.staff}{h.approvedBy ? ` / ${h.approvedBy}` : ''}</td>
                      <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{h.externalService || '-'}</td>
                      <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{h.externalMessageId || '-'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><span className={h.result === '成功' ? 'text-green-600' : 'text-red-600'}>{h.result}</span></td>
                      <td className="px-2 py-1.5 text-red-500 whitespace-nowrap">{h.errorReason || '-'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">{token ? `${token.status}(期限${fmtDate(token.expiresAt)})` : '-'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {token ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-400">アクセス: {accessedAt || '未アクセス'}</div>
                            <div className="text-slate-400">完了: {completedAt || '未完了'}</div>
                            {canEdit && !accessedAt && <button onClick={() => onSimulateAccess(h.id)} className="text-xs underline" style={{ color: COLOR.blue }}>アクセスを模擬</button>}
                            {canEdit && accessedAt && !completedAt && <button onClick={() => onSimulateComplete(h.id)} className="text-xs underline ml-1" style={{ color: COLOR.blue }}>完了を模擬</button>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{h.costEstimateYen != null ? `¥${h.costEstimateYen}` : '-'}</td>
                    </tr>
                  );
                })}
                {historyEntries.length === 0 && <tr><td colSpan={12} className="text-center text-slate-400 py-4">送信履歴がありません</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {composeOpen && (
        <SmsComposeModal
          participants={filtered.filter((p) => selected.includes(p.id))}
          onClose={() => setComposeOpen(false)}
          onCreateJobs={onCreateJobs}
        />
      )}
    </div>
  );
}

/* =========================================================================
   App 本体
   ========================================================================= */

export default function App() {
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [productImages, setProductImages] = useState(INITIAL_PRODUCT_IMAGES);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [meetingRequests, setMeetingRequests] = useState(INITIAL_MEETING_REQUESTS);
  const [manualPairList, setManualPairList] = useState([]);
  const [candidateMeta, setCandidateMeta] = useState(INITIAL_CANDIDATE_META);
  const [priorityOrderList, setPriorityOrderList] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState(INITIAL_SCHEDULE_SETTINGS);
  const [scheduleItems, setScheduleItems] = useState(INITIAL_SCHEDULE_ITEMS);
  const [scheduleConfirmations, setScheduleConfirmations] = useState(INITIAL_SCHEDULE_CONFIRMATIONS);
  const [unplacedInfo, setUnplacedInfo] = useState(_initialAutoScheduleResult.unplaced);
  const [smsJobs, setSmsJobs] = useState([]);
  const [smsUrlTokens, setSmsUrlTokens] = useState(INITIAL_SMS_URL_TOKENS);
  const [screen, setScreen] = useState('dashboard');
  const [role, setRole] = useState('事務局担当者');
  const [preset, setPreset] = useState(null);
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [composeTargets, setComposeTargets] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  // 保存データの読み込み(claude.aiの永続ストレージ機能を利用。ブラウザのlocalStorageは
  // Artifact内では動作しないため、代わりにこの仕組みでセッションをまたいで保持します。
  // 商品画像はデータ量が大きくなるため、この試作では保存対象に含めていません)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (window.storage) {
          const res = await window.storage.get('shodan-app-state-v5', false);
          if (!cancelled && res && res.value) {
            const data = JSON.parse(res.value);
            if (data.participants) setParticipants(data.participants);
            if (data.products) setProducts(data.products);
            if (data.contacts) setContacts(data.contacts);
            if (data.history) setHistory(data.history);
            if (data.meetingRequests) setMeetingRequests(data.meetingRequests);
            if (data.manualPairList) setManualPairList(data.manualPairList);
            if (data.candidateMeta) setCandidateMeta(data.candidateMeta);
            if (data.priorityOrderList) setPriorityOrderList(data.priorityOrderList);
            if (data.scheduleSettings) setScheduleSettings(data.scheduleSettings);
            if (data.scheduleItems) setScheduleItems(data.scheduleItems);
            if (data.scheduleConfirmations) setScheduleConfirmations(data.scheduleConfirmations);
            if (data.smsJobs) setSmsJobs(data.smsJobs);
            if (data.smsUrlTokens) setSmsUrlTokens(data.smsUrlTokens);
            if (data.role) setRole(data.role);
          }
        }
      } catch (e) {
        // 保存データがまだ無い場合はサンプルデータのまま利用する
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      try {
        if (window.storage) {
          window.storage.set('shodan-app-state-v5', JSON.stringify({
            participants, products, contacts, history, meetingRequests, manualPairList, candidateMeta, priorityOrderList,
            scheduleSettings, scheduleItems, scheduleConfirmations, smsJobs, smsUrlTokens, role,
          }), false).catch(() => {});
        }
      } catch (e) {
        // 保存に失敗しても画面操作は継続させる
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [participants, products, contacts, history, meetingRequests, manualPairList, candidateMeta, priorityOrderList,
    scheduleSettings, scheduleItems, scheduleConfirmations, smsJobs, smsUrlTokens, role, loaded]);

  // 商品画像の登録状況を進捗管理・リマインド管理へ自動反映
  useEffect(() => {
    setParticipants((prev) => prev.map((p) => {
      if (p.type !== '出展者') return p;
      const myProducts = products.filter((pr) => pr.companyId === p.id);
      if (myProducts.length === 0) return p;
      if (p.items.productImage === '修正依頼中' || p.items.productImage === '回答不要') return p;
      const withMain = myProducts.filter((pr) => productImages[pr.id] && productImages[pr.id].main);
      let newStatus;
      if (withMain.length === 0) newStatus = '未着手';
      else if (withMain.length < myProducts.length) newStatus = '入力中';
      else newStatus = '提出済み';
      if (p.items.productImage === newStatus) return p;
      return { ...p, items: { ...p.items, productImage: newStatus } };
    }));
  }, [products, productImages]);

  // 面談希望が登録されたら、進捗管理の「面談希望」項目を自動的に「提出済み」へ引き上げる
  // (確認済み・修正依頼中・回答不要などは上書きしません)
  useEffect(() => {
    setParticipants((prev) => prev.map((p) => {
      const mr = meetingRequests[p.id];
      const hasWishes = mr && mr.wishes && mr.wishes.length > 0;
      if (!hasWishes) return p;
      if (p.items.meetingRequest === '未着手' || p.items.meetingRequest === '入力中') {
        return { ...p, items: { ...p.items, meetingRequest: '提出済み' } };
      }
      return p;
    }));
  }, [meetingRequests]);

  // スケジュールが配置された会社について、確認状況を進捗管理の「スケジュール確認」項目へ反映
  // (未確認→入力中、修正希望→修正依頼中、承認→確認済み)。あわせて、まだ日付が無い場合は
  // 「仮スケジュール公開日」を記録し、既存のリマインド抽出ロジック(3日経過で対象化)につなげます。
  useEffect(() => {
    setParticipants((prev) => prev.map((p) => {
      const hasMeetings = scheduleItems.some((it) => it.buyerId === p.id || it.exhibitorId === p.id);
      if (!hasMeetings) return p;
      const conf = scheduleConfirmations[p.id] || '未確認';
      let newStatus;
      if (conf === '承認') newStatus = '確認済み';
      else if (conf === '修正希望') newStatus = '修正依頼中';
      else newStatus = '入力中';
      const needsPublishDate = !p.scheduleTentativePublishedDate;
      if (p.items.scheduleConfirm === newStatus && !needsPublishDate) return p;
      return {
        ...p,
        items: { ...p.items, scheduleConfirm: newStatus },
        scheduleTentativePublishedDate: p.scheduleTentativePublishedDate || TODAY_STR,
      };
    }));
  }, [scheduleItems, scheduleConfirmations]);

  const candidates = useMemo(
    () => generateCandidates(participants, products, meetingRequests, manualPairList),
    [participants, products, meetingRequests, manualPairList],
  );

  // 優先順位リストを候補の増減に合わせて同期(新規候補はスコア降順で末尾に追加)
  useEffect(() => {
    setPriorityOrderList((prev) => {
      const currentIds = candidates.map((c) => c.id);
      const kept = prev.filter((id) => currentIds.includes(id));
      const missing = currentIds.filter((id) => !kept.includes(id));
      missing.sort((a, b) => {
        const ca = candidates.find((c) => c.id === a);
        const cb = candidates.find((c) => c.id === b);
        return (cb ? cb.score : 0) - (ca ? ca.score : 0);
      });
      const next = [...kept, ...missing];
      const same = next.length === prev.length && next.every((id, i) => id === prev[i]);
      return same ? prev : next;
    });
    // eslint-disable-next-line
  }, [candidates]);

  const meetingCounts = useMemo(() => {
    const counts = {};
    candidates.forEach((c) => {
      const status = (candidateMeta[c.id] && candidateMeta[c.id].status) || (c.category === '対応不可' ? '除外' : '保留');
      if (status === '採用') {
        counts[c.exhibitorId] = (counts[c.exhibitorId] || 0) + 1;
        counts[c.buyerId] = (counts[c.buyerId] || 0) + 1;
      }
    });
    return counts;
  }, [candidates, candidateMeta]);

  const goProgress = (p) => { setPreset(p || null); setScreen('progress'); };
  const goList = (type) => setScreen(type === '出展者' ? 'exhibitors' : 'buyers');
  const goReminder = () => setScreen('reminder');
  const goProducts = () => setScreen('products');
  const goMatching = () => setScreen('matching');
  const goImages = (productId) => { setSelectedProductId(productId); setScreen('productImages'); };
  const goSchedule = () => setScreen('schedule');

  const runAutoSchedule = () => {
    const approved = candidates.filter((c) => ((candidateMeta[c.id] && candidateMeta[c.id].status) || (c.category === '対応不可' ? '除外' : '保留')) === '採用');
    const result = autoSchedule(approved, participants, scheduleSettings);
    setScheduleItems(result.placed);
    setUnplacedInfo(result.unplaced);
    showToast(`自動配置を実行しました(配置${result.placed.length}件 / 未配置${result.unplaced.length}件)`);
  };
  const saveScheduleSettings = (form) => {
    setScheduleSettings(form);
    showToast('スケジュール設定を保存しました(配置は変更していません)');
  };
  const updateScheduleItem = (id, patch) => {
    setScheduleItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const deleteScheduleItem = (id) => {
    setScheduleItems((prev) => prev.filter((it) => it.id !== id));
    showToast('面談を削除しました');
  };
  const addScheduleItem = (data) => {
    setScheduleItems((prev) => [...prev, { ...data, id: `sch_manual_${Date.now()}`, status: '作成中' }]);
    showToast('面談を追加しました');
  };
  const changeScheduleConfirmation = (companyId, value) => {
    setScheduleConfirmations((prev) => ({ ...prev, [companyId]: value }));
  };
  const goSms = () => setScreen('sms');

  const createSmsJobs = (companyIds, bodyTemplate, mode, extra) => {
    const newJobs = [];
    const newTokens = {};
    companyIds.forEach((id) => {
      const p = participants.find((pp) => pp.id === id);
      if (!p) return;
      const token = generateSmsToken();
      const url = `${SMS_URL_BASE}/${token}`;
      const body = personalizeSms(bodyTemplate, p, url);
      newTokens[token] = { companyId: id, issuedAt: nowTimestamp(), expiresAt: addDays(TODAY_STR, SMS_TOKEN_VALID_DAYS), accessedAt: null, completedAt: null, status: '有効' };
      let status;
      if (mode === '管理者承認後に送信') status = '承認待ち';
      else if (mode === '予約送信') status = '予約済み';
      else if (mode === '条件付き自動送信') status = '条件待ち';
      else if (mode === '下書き保存') status = '下書き';
      else status = '除外';
      newJobs.push({
        id: `smsjob_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        companyId: id, body, charCount: body.length, mode, status,
        scheduledAt: extra.scheduledAt || null, conditionNote: extra.conditionNote || null,
        reasonSummary: computeSmsReasons(p).map((r) => r.label).join('、'),
        urlToken: token, createdAt: nowTimestamp(), createdBy: STAFF_LIST[0],
        approvedBy: null, approvedAt: null, sentAt: null, externalService: null, externalMessageId: null, deliveryResult: null, errorReason: null,
      });
    });
    setSmsJobs((prev) => [...prev, ...newJobs]);
    setSmsUrlTokens((prev) => ({ ...prev, ...newTokens }));
    showToast(`${newJobs.length}件のSMSを登録しました`);
  };

  const executeJobSend = (jobId) => {
    const job = smsJobs.find((j) => j.id === jobId);
    if (!job) return;
    const success = Math.random() < 0.9;
    const result = success ? '成功' : '失敗';
    const errorReason = success ? null : (Math.random() < 0.5 ? '圏外・電源オフのため未達' : '無効な電話番号');
    const externalMessageId = `MSG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const sentAt = nowTimestamp();
    const p = participants.find((pp) => pp.id === job.companyId);
    setSmsJobs((prev) => prev.map((j) => (j.id === jobId ? {
      ...j, status: success ? '送信済み' : '送信失敗', approvedBy: STAFF_LIST[0], approvedAt: sentAt, sentAt,
      externalService: EXTERNAL_SMS_SERVICE_NAME, externalMessageId, deliveryResult: result, errorReason,
    } : j)));
    setHistory((prev) => [{
      id: `${Date.now()}-${job.companyId}-sms`, datetime: sentAt, company: p ? p.companyName : job.companyId, channel: 'SMS',
      content: job.body, items: p ? (incompleteItemLabels(p).join('、') || 'なし') : '', staff: job.createdBy || STAFF_LIST[0], result, next: '-',
      sendReason: job.reasonSummary, approvedBy: STAFF_LIST[0], externalService: EXTERNAL_SMS_SERVICE_NAME,
      externalMessageId, errorReason, urlToken: job.urlToken, urlAccessedAt: null, urlCompletedAt: null, costEstimateYen: SMS_COST_PER_MESSAGE,
    }, ...prev]);
    if (p) setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, smsCount: (x.smsCount || 0) + 1, lastContactDate: TODAY_STR } : x)));
    showToast(success ? 'SMSを送信しました(模擬)' : 'SMS送信に失敗しました(模擬)');
  };

  const excludeSmsJob = (jobId) => setSmsJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: '除外' } : j)));
  const setSmsConsentValue = (companyId, value) => setParticipants((prev) => prev.map((p) => (p.id === companyId ? { ...p, smsConsent: value } : p)));
  const toggleSmsBlockedValue = (companyId) => setParticipants((prev) => prev.map((p) => (p.id === companyId ? { ...p, smsBlocked: !p.smsBlocked } : p)));
  const simulateUrlAccess = (historyId) => setHistory((prev) => prev.map((h) => (h.id === historyId ? { ...h, urlAccessedAt: nowTimestamp() } : h)));
  const simulateUrlComplete = (historyId) => setHistory((prev) => prev.map((h) => (h.id === historyId ? { ...h, urlCompletedAt: nowTimestamp() } : h)));

  const updateItemStatus = (id, key, value) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, items: { ...p.items, [key]: value } } : p)));
  };
  const updateStaff = (id, staff) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, assignedStaff: staff } : p)));
  };

  const saveCompany = (form, isNew) => {
    setParticipants((prev) => (isNew ? [...prev, form] : prev.map((p) => (p.id === form.id ? { ...p, ...form } : p))));
    showToast(isNew ? `${form.companyName}を新規登録しました` : `${form.companyName}の情報を更新しました`);
  };

  const saveProduct = (form, isNew) => {
    setProducts((prev) => (isNew ? [...prev, form] : prev.map((p) => (p.id === form.id ? { ...p, ...form } : p))));
    showToast(isNew ? `${form.productName}を新規登録しました` : `${form.productName}を更新しました`);
  };
  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setProductImages((prev) => { const next = { ...prev }; delete next[id]; return next; });
    showToast('商品を削除しました');
  };

  const setProductImage = (productId, next) => {
    setProductImages((prev) => ({ ...prev, [productId]: next }));
  };

  const saveMeetingRequest = (companyId, data) => {
    setMeetingRequests((prev) => ({ ...prev, [companyId]: data }));
    showToast('面談希望を保存しました');
  };

  const moveCandidate = (id, dir) => {
    setPriorityOrderList((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx]; next[idx] = next[target]; next[target] = tmp;
      return next;
    });
  };

  const setCandidateStatus = (id, status) => {
    if (status === '採用') {
      const c = candidates.find((cc) => cc.id === id);
      if (c) {
        const exCount = meetingCounts[c.exhibitorId] || 0;
        const byCount = meetingCounts[c.buyerId] || 0;
        if (exCount >= MAX_MEETINGS_PER_COMPANY || byCount >= MAX_MEETINGS_PER_COMPANY) {
          showToast(`面談数の上限(${MAX_MEETINGS_PER_COMPANY}件)を超える可能性があります。ご確認のうえ採用してください`);
        }
      }
    }
    setCandidateMeta((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), status } }));
  };
  const setCandidateMemo = (id, text) => setCandidateMeta((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), memo: text } }));

  const addManualCandidate = (exhibitorId, buyerId, productId) => {
    const key = `${exhibitorId}_${buyerId}`;
    if (candidates.some((c) => c.id === key)) { showToast('すでに候補として存在します'); return; }
    setManualPairList((prev) => [...prev, { exhibitorId, buyerId, productId }]);
    showToast('マッチング候補を追加しました');
  };

  const applyImport = (importType, rows) => {
    const cfg = IMPORT_TYPES[importType];
    if (cfg.kind === 'company') {
      setParticipants((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        rows.forEach((d) => {
          const existing = map.get(d.companyId);
          const patch = {
            companyName: d.companyName || (existing ? existing.companyName : ''),
            companyNameKana: d.companyNameKana || (existing ? existing.companyNameKana : ''),
            postalCode: d.postalCode || (existing ? existing.postalCode : ''),
            address: d.address || (existing ? existing.address : ''),
            phone: d.phone || (existing ? existing.phone : ''),
            mobile: d.mobile || (existing ? existing.mobile : ''),
            website: d.website || (existing ? existing.website : ''),
            industry: d.industry || (existing ? existing.industry : ''),
            introduction: d.introduction || (existing ? existing.introduction : ''),
            referral: d.referral || (existing ? existing.referral : ''),
            department: d.department || (existing ? existing.department : ''),
            contactName: d.contactName || (existing ? existing.contactName : ''),
            email: d.email || (existing ? existing.email : ''),
            note: d.note || (existing ? existing.note : ''),
            companyStatus: d.companyStatus || (existing ? existing.companyStatus : '仮登録'),
          };
          if (existing) {
            map.set(d.companyId, { ...existing, ...patch });
          } else {
            map.set(d.companyId, { ...emptyCompany(cfg.fixedKubun), id: d.companyId, ...patch });
          }
        });
        return Array.from(map.values());
      });
    } else if (cfg.kind === 'contact') {
      setContacts((prev) => {
        const others = prev.filter((c) => !rows.some((d) => d.companyId === c.companyId && d.contactName === c.contactName && d.email === c.email));
        return [...others, ...rows];
      });
    } else if (cfg.kind === 'product') {
      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        rows.forEach((d) => {
          map.set(d.productId, {
            id: d.productId, companyId: d.companyId, productName: d.productName, category: d.category, subCategory: d.subCategory,
            description: d.description, features: d.features, targetCustomer: d.targetCustomer, desiredBuyer: d.desiredBuyer,
            channel: d.channel, retailPrice: d.retailPrice, wholesalePrice: d.wholesalePrice, minOrderQty: d.minOrderQty,
            area: d.area, temperatureZone: d.temperatureZone, expiry: d.expiry, certification: d.certification,
            allergen: d.allergen, jan: d.jan, pitch: d.pitch,
          });
        });
        return Array.from(map.values());
      });
    }
  };

  const openCompose = (list) => setComposeTargets(list);
  const closeCompose = () => setComposeTargets(null);

  const handleAction = (action) => {
    if (!composeTargets) return;
    const ids = composeTargets.map((p) => p.id);

    if (action.type === 'send') {
      const newEntries = [];
      setParticipants((prev) => prev.map((p) => {
        if (!ids.includes(p.id)) return p;
        if (action.useMail) {
          newEntries.push({
            id: `${Date.now()}-${p.id}-mail`, datetime: nowTimestamp(), company: p.companyName, channel: 'メール',
            content: personalize(action.subject, p), items: incompleteItemLabels(p).join('、') || 'なし',
            staff: p.assignedStaff, result: '成功', next: p.nextActionDate || '-',
          });
        }
        if (action.useSms) {
          newEntries.push({
            id: `${Date.now()}-${p.id}-sms`, datetime: nowTimestamp(), company: p.companyName, channel: 'SMS',
            content: personalize(action.smsBody, p), items: incompleteItemLabels(p).join('、') || 'なし',
            staff: p.assignedStaff, result: '成功', next: p.nextActionDate || '-',
          });
        }
        return {
          ...p,
          mailCount: p.mailCount + (action.useMail ? 1 : 0),
          smsCount: p.smsCount + (action.useSms ? 1 : 0),
          lastContactDate: TODAY_STR,
          actionState: '送信済み',
        };
      }));
      setHistory((prev) => [...newEntries, ...prev]);
      showToast(`${ids.length}件を送信済みに変更しました`);
    } else if (action.type === 'setState') {
      setParticipants((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, actionState: action.actionState } : p)));
      showToast(`${ids.length}件を「${action.actionState}」に変更しました`);
    } else if (action.type === 'extend') {
      setParticipants((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, deadline: action.newDeadline, actionState: '期限延長中' } : p)));
      showToast(`${ids.length}件の期限を延長しました`);
    } else if (action.type === 'nextDate') {
      setParticipants((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, nextActionDate: action.date } : p)));
      showToast(`${ids.length}件に次回対応日を登録しました`);
    } else if (action.type === 'memo') {
      setParticipants((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, memos: [...(p.memos || []), { date: TODAY_STR, staff: p.assignedStaff, text: action.text }] } : p)));
      const memoEntries = composeTargets.map((p) => ({
        id: `${Date.now()}-${p.id}-memo`, datetime: nowTimestamp(), company: p.companyName, channel: 'メモ',
        content: action.text, items: incompleteItemLabels(p).join('、') || 'なし', staff: p.assignedStaff, result: '-', next: '-',
      }));
      setHistory((prev) => [...memoEntries, ...prev]);
      showToast(`${ids.length}件に対応メモを記録しました`);
    }
  };

  const canEdit = role === 'システム管理者' || role === '事務局担当者';

  function renderScreen() {
    if (role === '出展者' || role === 'バイヤー') {
      return <PortalPlaceholder role={role} onSwitch={() => setRole('事務局担当者')} />;
    }
    const navItem = NAV_ITEMS.find((n) => n.key === screen);
    if (navItem && !navItem.active) return <ComingSoon label={navItem.label} />;
    if (screen === 'dashboard') return <Dashboard participants={participants} products={products} candidates={candidates} goProgress={goProgress} goList={goList} goProducts={goProducts} goReminder={goReminder} goMatching={goMatching} />;
    if (screen === 'exhibitors') return <ExhibitorList participants={participants} products={products} contacts={contacts} goProgress={goProgress} onSaveCompany={saveCompany} showToast={showToast} canEdit={canEdit} />;
    if (screen === 'buyers') return <BuyerList participants={participants} contacts={contacts} goProgress={goProgress} onSaveCompany={saveCompany} showToast={showToast} canEdit={canEdit} />;
    if (screen === 'products') return <ProductManagementScreen participants={participants} products={products} onSaveProduct={saveProduct} onDeleteProduct={deleteProduct} showToast={showToast} goImages={goImages} canEdit={canEdit} />;
    if (screen === 'csv') return canEdit ? <CSVImportScreen participants={participants} onApply={applyImport} showToast={showToast} /> : <RestrictedForRole />;
    if (screen === 'productImages') return <ProductImageScreen participants={participants} products={products} productImages={productImages} setProductImage={setProductImage} selectedProductId={selectedProductId} setSelectedProductId={setSelectedProductId} canEdit={canEdit} />;
    if (screen === 'progress') return <ProgressScreen participants={participants} preset={preset} onClearPreset={() => setPreset(null)} canEdit={canEdit} updateItemStatus={updateItemStatus} updateStaff={updateStaff} onOpenDetail={setDetailId} />;
    if (screen === 'reminder') return <ReminderScreen participants={participants} onOpenCompose={openCompose} />;
    if (screen === 'reminderHistory') return <HistoryScreen history={history} />;
    if (screen === 'meetingRequests') return <MeetingRequestScreen participants={participants} products={products} meetingRequests={meetingRequests} onSaveMeetingRequest={saveMeetingRequest} canEdit={canEdit} />;
    if (screen === 'matching') {
      return (
        <MatchingScreen
          participants={participants}
          products={products}
          candidates={candidates}
          priorityOrderList={priorityOrderList}
          moveCandidate={moveCandidate}
          candidateMeta={candidateMeta}
          setCandidateStatus={setCandidateStatus}
          setCandidateMemo={setCandidateMemo}
          addManualCandidate={addManualCandidate}
          meetingCounts={meetingCounts}
          canEdit={canEdit}
        />
      );
    }
    if (screen === 'schedule') {
      return (
        <ScheduleScreen
          participants={participants}
          products={products}
          meetingRequests={meetingRequests}
          candidateMeta={candidateMeta}
          scheduleSettings={scheduleSettings}
          scheduleItems={scheduleItems}
          scheduleConfirmations={scheduleConfirmations}
          onSaveSettings={saveScheduleSettings}
          onRunAutoSchedule={runAutoSchedule}
          onUpdateItem={updateScheduleItem}
          onDeleteItem={deleteScheduleItem}
          onAddItem={addScheduleItem}
          onChangeConfirmation={changeScheduleConfirmation}
          unplacedInfo={unplacedInfo}
          canEdit={canEdit}
        />
      );
    }
    if (screen === 'sms') {
      return (
        <SmsScreen
          participants={participants}
          history={history}
          smsJobs={smsJobs}
          smsUrlTokens={smsUrlTokens}
          onCreateJobs={createSmsJobs}
          onExecuteJob={executeJobSend}
          onExcludeJob={excludeSmsJob}
          onSetConsent={setSmsConsentValue}
          onToggleBlocked={toggleSmsBlockedValue}
          onSimulateAccess={simulateUrlAccess}
          onSimulateComplete={simulateUrlComplete}
          canEdit={canEdit}
        />
      );
    }
    return null;
  }

  return (
    <div className="h-screen w-full flex" style={{ backgroundColor: '#F5F7FB', color: '#1e293b', fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,'Segoe UI',sans-serif" }}>
      <GlobalStyles />
      <Sidebar screen={screen} setScreen={(s) => { setPreset(null); setScreen(s); }} role={role} setRole={setRole} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar screen={screen} role={role} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderScreen()}
        </main>
      </div>
      {toast && <Toast message={toast} />}
      {composeTargets && <ComposeModal participants={composeTargets} onClose={closeCompose} onAction={handleAction} />}
      {detailId && <DetailModal participant={participants.find((p) => p.id === detailId)} history={history} onClose={() => setDetailId(null)} />}
    </div>
  );
}
