/**
 * 日期选到天，时间由调用方补全。
 * 传给后端的格式仍是 yyyy-MM-dd HH:mm:ss。
 */

const DAY_START = '00:00:00';
const DAY_END = '23:59:59';

function pad(n) {
  const s = String(n);
  return s.length < 2 ? `0${s}` : s;
}

function range(from, to) {
  const list = [];
  for (let i = from; i <= to; i += 1) list.push(pad(i));
  return list;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseDateTime(str) {
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(String(str || '').trim());
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = Number(matched[4]);
  const minute = Number(matched[5]);
  const second = Number(matched[6]);
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }
  return date;
}

function nowString() {
  return formatDateTime(new Date());
}

/**
 * 日期选择器三列：年、月、日
 * @param {Date} date
 */
function buildColumns(date) {
  const year = date.getFullYear();
  const years = [];
  for (let i = year - 5; i <= year + 10; i += 1) years.push(String(i));
  const months = range(1, 12);
  const dim = daysInMonth(year, date.getMonth() + 1);
  const days = range(1, dim);
  const values = [
    String(year),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ];
  const lists = [years, months, days];
  const columns = lists.map((list, index) => ({
    values: list,
    defaultIndex: Math.max(0, list.indexOf(values[index])),
  }));
  return { columns, values, dayCount: dim };
}

function dayValues(count) {
  return range(1, count);
}

function columnNumber(item) {
  if (item && typeof item === 'object') {
    if (item.text != null) item = item.text;
    else if (item.value != null) item = item.value;
  }
  const matched = /^(\d+)/.exec(String(item == null ? '' : item).trim());
  return matched ? Number(matched[1]) : NaN;
}

function dateParts(input) {
  if (input instanceof Date) {
    return [String(input.getFullYear()), pad(input.getMonth() + 1), pad(input.getDate())];
  }
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(input || '').trim());
  if (!matched) return null;
  return [matched[1], pad(Number(matched[2])), pad(Number(matched[3]))];
}

function joinDay(values, clock) {
  const year = columnNumber(values && values[0]);
  const month = columnNumber(values && values[1]);
  let day = columnNumber(values && values[2]);
  if (!Number.isInteger(year) || year < 1000 || month < 1 || month > 12 || day < 1) return '';
  const dim = daysInMonth(year, month);
  if (day > dim) day = dim;
  return `${year}-${pad(month)}-${pad(day)} ${clock}`;
}

function completeDay(values, edge) {
  return joinDay(values, edge === 'start' ? DAY_START : DAY_END);
}

function startOfDay(input) {
  const parts = dateParts(input == null ? new Date() : input);
  return parts ? joinDay(parts, DAY_START) : '';
}

function endOfDay(input) {
  const parts = dateParts(input == null ? new Date() : input);
  return parts ? joinDay(parts, DAY_END) : '';
}

module.exports = {
  pad,
  daysInMonth,
  formatDateTime,
  parseDateTime,
  nowString,
  buildColumns,
  dayValues,
  dateParts,
  joinDay,
  completeDay,
  startOfDay,
  endOfDay,
  DAY_START,
  DAY_END,
};
