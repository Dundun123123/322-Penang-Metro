/** Accept ISO dates or date-times with an explicit timezone; store UTC consistently. */
export function parseNoticeDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(
      text,
    );
  if (!match) return undefined;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText),
    month = Number(monthText),
    day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return undefined;
  if (Number(hourText || 0) > 23 || Number(minuteText || 0) > 59 || Number(secondText || 0) > 59)
    return undefined;
  if (zone && zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))
    return undefined;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function noticeDates(
  start: unknown,
  end: unknown,
): { error: string } | { startAt: string | null; endAt: string | null } {
  const startAt = parseNoticeDate(start),
    endAt = parseNoticeDate(end);
  if (startAt === undefined || endAt === undefined)
    return { error: "Enter valid ISO dates, including a timezone for date-times" } as const;
  if (startAt && endAt && startAt > endAt)
    return { error: "The end date must not be before the start date" } as const;
  return { startAt, endAt };
}
