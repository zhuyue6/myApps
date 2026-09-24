/**
 * 年月日时分秒。格式与后端 DateFormat 一致：yyyy-MM-dd HH:mm:ss
 */

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
  const matched = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(str || '');
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
 * 时间选择器六列：年、月、日、时、分、秒
 * @param {Date} date
 */
function buildColumns(date) {
  const year = date.getFullYear();
  const years = [];
  for (let i = year - 5; i <= year + 10; i += 1) years.push(String(i));
  const months = range(1, 12);
  const dim = daysInMonth(year, date.getMonth() + 1);
  const days = range(1, dim);
  const hours = range(0, 23);
  const seconds = range(0, 59);
  const values = [
    String(year),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ];
  const lists = [years, months, days, hours, seconds, seconds];
  const columns = lists.map((list, index) => ({
    values: list,
    defaultIndex: Math.max(0, list.indexOf(values[index])),
  }));
  return { columns, values, dayCount: dim };
}

function dayValues(count) {
  return range(1, count);
}

function joinDateTime(values) {
  if (!values || values.length < 6) return '';
  return `${values[0]}-${values[1]}-${values[2]} ${values[3]}:${values[4]}:${values[5]}`;
}

module.exports = {
  pad,
  daysInMonth,
  formatDateTime,
  parseDateTime,
  nowString,
  buildColumns,
  dayValues,
  joinDateTime,
};
