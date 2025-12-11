import { DateTime } from 'luxon';

/**
 * Mengonversi waktu dari perangkat ke UTC
 * @param raw Format "yyyy-MM-dd HH:mm:ss"
 * @param offset Offset zona waktu perangkat, ex: 7, -7
 */
export function convertDeviceTimeUTC(
  raw: string,
  offset: number | string,
): Date | null {
  const zone =
    offset === 0 ? 'UTC' : `UTC${Number(offset) > 0 ? `+${offset}` : offset}`;

  const dt = DateTime.fromFormat(raw, 'yyyy-MM-dd HH:mm:ss', {
    zone,
  });

  if (!dt.isValid) {
    return null;
  }

  return dt.toUTC().toJSDate();
}

/**
 * Baca unsigned 32-bit integer dari buffer
 * @param buf Buffer sumber data
 * @param offset Posisi offset dalam buffer
 * @returns number
 */
export function u32(buf: Buffer, offset: number) {
  return buf.readUInt32LE(offset);
}

/**
 *
 * @param {number} time
 */
export function decodeTime(time: number) {
  const second = time % 60;
  time = (time - second) / 60;

  const minute = time % 60;
  time = (time - minute) / 60;

  const hour = time % 24;
  time = (time - hour) / 24;

  const day = (time % 31) + 1;
  time = (time - (day - 1)) / 31;

  const month = time % 12;
  time = (time - month) / 12;

  const year = time + 2000;

  return new Date(year, month, day, hour, minute, second);
}

/**
 *
 * @param {Date} date
 */
export function encodeTime(date: Date) {
  return (
    ((date.getFullYear() % 100) * 12 * 31 +
      date.getMonth() * 31 +
      date.getDate() -
      1) *
      (24 * 60 * 60) +
    (date.getHours() * 60 + date.getMinutes()) * 60 +
    date.getSeconds()
  );
}

/**
 * Menghasilkan delay acak dalam menit → output: milliseconds
 */
export function randomMinutes(min: number, max: number): number {
  const minMs = min * 60_000;
  const maxMs = max * 60_000;

  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}
