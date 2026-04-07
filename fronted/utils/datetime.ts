/**
 * 日期时间工具函数
 * 用于统一格式化显示和跨浏览器日期时间输入处理
 */

/**
 * 将 datetime-local 格式字符串或 ISO 字符串格式化为友好的中文显示
 * "2026-04-07T01:23" → "4月7日 01:23"
 * "2025-12-25T09:30" → "2025年12月25日 09:30" (跨年时显示年份)
 */
export function formatDateTime(datetimeStr: string): string {
  if (!datetimeStr) return '';
  const date = new Date(datetimeStr);
  if (isNaN(date.getTime())) return datetimeStr;

  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (isThisYear) {
    return `${month}月${day}日 ${hours}:${minutes}`;
  }
  return `${date.getFullYear()}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 将 datetime-local 字符串拆分为 date 和 time 部分
 * "2026-04-07T01:23" → { date: "2026-04-07", time: "01:23" }
 */
export function splitDatetime(datetimeStr: string): { date: string; time: string } {
  if (!datetimeStr) return { date: '', time: '' };
  const [date, time] = datetimeStr.split('T');
  return { date: date || '', time: time || '' };
}

/**
 * 将独立的 date 和 time 合并为 datetime-local 格式
 * "2026-04-07" + "01:23" → "2026-04-07T01:23"
 */
export function combineDatetime(date: string, time: string): string {
  if (!date) return '';
  return time ? `${date}T${time}` : `${date}T00:00`;
}

/**
 * 获取当前时间作为 datetime-local 格式（用于默认值）
 */
export function nowDatetimeLocal(): string {
  const now = new Date();
  const date = now.getFullYear().toString().padStart(4, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${date}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 获取今天的日期作为 date 格式
 */
export function todayDate(): string {
  const now = new Date();
  const date = now.getFullYear().toString().padStart(4, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${date}-${month}-${day}`;
}
