import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Membaca versi aplikasi dari file package.json
 *
 * Fungsi ini adalah utilitas internal yang mencoba membaca dan mem-parse package.json.
 * Jika terjadi kesalahan (mis. file tidak ditemukan atau JSON tidak valid), fungsi
 * akan mengembalikan undefined.
 *
 * @internal
 * @returns Promise yang menyelesaikan ke string versi jika berhasil, atau undefined jika gagal.
 *
 * @example
 * // Jika package.json berisi { "version": "1.2.3" }
 * await readPackageJsonVersion() // -> "1.2.3"
 */
async function readPackageJsonVersion(): Promise<string | undefined> {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageData = JSON.parse(packageJsonContent) as { version?: string };
    return packageData.version;
  } catch {
    return undefined;
  }
}

/**
 * Mendapatkan versi aplikasi saat ini dari package.json.
 *
 * Fungsi ini menggunakan readPackageJsonVersion() dan mengembalikan nilai default "1.0.0"
 * jika versi tidak ditemukan atau terjadi kesalahan saat membaca package.json.
 *
 * @returns Promise yang menyelesaikan ke string versi aplikasi (mis. "1.2.3" atau "1.0.0").
 *
 * @example
 * await getAppVersion() // -> "1.2.3" atau "1.0.0" jika tidak tersedia
 */
export async function getAppVersion(): Promise<string> {
  return (await readPackageJsonVersion()) || '1.0.0';
}

/**
 * Mengubah setiap kata dalam teks menjadi kapitalisasi kata (Title Case).
 *
 * Fungsi ini mengubah huruf pertama dari setiap kata menjadi huruf kapital
 * dan sisanya menjadi huruf kecil.
 * @param text Teks input yang akan diubah.
 * @returns Teks dengan kapitalisasi kata.
 *
 * @example
 * ucWords('hello world') // -> 'Hello World'
 * ucWords('JAVA script LANGUAGE') // -> 'Java Script Language'
 */
export function ucWords(text?: string): string {
  if (!text) return '';

  return text
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s|[-'])[a-z]/g, (match) => match.toUpperCase());
}
