/**
 * 日期工具：与打卡周期、自然日边界对齐（本地时区）
 */

/**
 * @param {Date} d
 * @returns {string} YYYY-MM-DD
 */
function toYMD(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} ymd
 * @returns {Date} 本地 0 点
 */
function parseYMD(ymd) {
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  return new Date(y, m - 1, d);
}

/** 当天 YYYY-MM-DD */
function todayYMD() {
  return toYMD(new Date());
}

/**
 * @param {string} a YYYY-MM-DD
 * @param {string} b YYYY-MM-DD
 * @returns {number} a - b 的天数差
 */
function diffDays(a, b) {
  const da = parseYMD(a).getTime();
  const db = parseYMD(b).getTime();
  return Math.round((da - db) / 86400000);
}

/**
 * @param {string} ymd
 * @returns {number} 0=周日 … 6=周六
 */
function weekday(ymd) {
  return parseYMD(ymd).getDay();
}

/**
 * ISO 周：返回 { year, week } 与周期 key `YYYY-Www`
 * @param {string} ymd
 */
function isoWeekKey(ymd) {
  const date = parseYMD(ymd);
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const w =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  const y = tmp.getFullYear();
  return { year: y, week: w, key: `${y}-W${`${w}`.padStart(2, '0')}` };
}

/** @param {string} ymd */
function monthKey(ymd) {
  return ymd.slice(0, 7);
}

/** @param {string} ymd */
function yearKey(ymd) {
  return ymd.slice(0, 4);
}

/**
 * 枚举区间内所有自然日（含端点）
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {string[]}
 */
function eachDayInclusive(startYmd, endYmd) {
  const out = [];
  let cur = parseYMD(startYmd);
  const end = parseYMD(endYmd);
  while (cur.getTime() <= end.getTime()) {
    out.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * @param {string} hm "HH:mm"
 * @returns {{h:number,m:number}}
 */
function parseHM(hm) {
  if (!hm || typeof hm !== 'string') return { h: 0, m: 0 };
  const [h, m] = hm.split(':').map((x) => Number(x));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/**
 * 当前时间是否在 [from,to] 闭区间内（支持跨日：from>to 表示跨午夜）
 * @param {string} fromHm
 * @param {string} toHm
 */
function isNowInHmWindow(fromHm, toHm) {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const a = parseHM(fromHm);
  const b = parseHM(toHm);
  const ma = a.h * 60 + a.m;
  const mb = b.h * 60 + b.m;
  if (ma <= mb) return mins >= ma && mins <= mb;
  return mins >= ma || mins <= mb;
}

module.exports = {
  toYMD,
  parseYMD,
  todayYMD,
  diffDays,
  weekday,
  isoWeekKey,
  monthKey,
  yearKey,
  eachDayInclusive,
  parseHM,
  isNowInHmWindow,
};
