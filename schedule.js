/** Parse local wall-clock HH:MM values into minutes after midnight. */
export function parseTime(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('时间必须为 24 小时制 HH:MM，例如 09:30');
  }
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

/** Return validated intervals. Start is inclusive, end is exclusive. */
export function parsePeriods(value = []) {
  if (!Array.isArray(value)) throw new Error('disabledPeriods 必须是时间段列表');
  return value.map((period, index) => {
    if (!period || typeof period !== 'object' || Array.isArray(period)) {
      throw new Error('第 ' + (index + 1) + ' 个时间段必须包含 start 和 end');
    }
    const start = parseTime(period.start);
    const end = parseTime(period.end);
    return { start, end };
  });
}

/** Is the given local wall-clock time inside any interval? */
export function isDisabledTime(periods, date = new Date()) {
  const minute = date.getHours() * 60 + date.getMinutes();
  return periods.some(({ start, end }) => start === end || (start < end
    ? minute >= start && minute < end
    : minute >= start || minute < end));
}
