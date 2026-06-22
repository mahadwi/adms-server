import { Injectable, NotFoundException } from '@nestjs/common';
import { FileLoggerService } from 'src/common/logger/file-logger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Device } from 'generated/prisma';
import {
  PayloadParams,
  ResponseCommand,
  ResponseCommandInfo,
} from 'src/types/iclock.type';
import { convertDeviceTimeUTC } from 'src/common/utils/format.util';
import { WebhookService } from 'src/webhook/webhook.service';
import { AttendanceWebhookPayload } from 'src/types/webhook.types';

@Injectable()
export class IclockService {
  private readonly logger = new FileLoggerService(IclockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async findBySerial(sn: string) {
    return await this.prisma.device.findFirst({
      where: { serialNumber: sn },
    });
  }

  /**
   * Menangani permintaan awal untuk sinchronize konfigurasi dari server ke perangkat fingerprint.
   * @param device Perangkat iClock yang mengirim permintaan
   * @param params Parameter yang diterima dari perangkat
   * @returns Respon berupa string
   */
  async index(device?: Device, params?: PayloadParams) {
    if (!device) throw new NotFoundException('Device not found');

    const result = [
      `GET OPTION FROM: ${device.serialNumber}`,
      `Stamp=${device.stamp || '0'}`,
      `OpStamp=${device.opStamp || '0'}`,
      `ErrorDelay=${device.errorDelay || 60}`,
      `Delay=${device.delay || 60}`,
      `TransTimes=${device.transTimes || '00:00;14:05'}`,
      `TransInterval=${device.transInterval || 1}`,
      `TransFlag=${device.transFlag || '1111000000'}`,
      `TimeZone=${device.timezone || 7}`,
      `Realtime=${device.realtime || 1}`,
      `Encrypt=${device.encryption || '0'}`,
    ].join('\n');

    const newRaw = params?.query ? params.query : {};

    await this.prisma.device.update({
      where: { id: device.id },
      data: { rawData: newRaw },
    });

    this.logger.log(`Connection>>> ${device.serialNumber}`);
    return result;
  }

  /**
   * Menangani permintaan command dari server ke perangkat fingerprint.
   * @param device Perangkat iClock yang mengirim permintaan
   * @param params Parameter yang diterima dari perangkat
   * @returns Respon berupa string
   */
  async getRequest(device?: Device, params?: PayloadParams) {
    if (!device) throw new NotFoundException('Device not found');

    this.logger.log(`Request>>> ${device.serialNumber}`);

    // Update device info if "info" parameter is present
    const info = params?.query?.info;
    if (info) {
      const parts = info.split(',');
      await this.prisma.device.update({
        where: { id: device.id },
        data: {
          firmwareVersion: parts[0],
          totalUsers: parseInt(parts[1] || '0'),
          totalFingerprints: parseInt(parts[2] || '0'),
          totalAttendances: parseInt(parts[3] || '0'),
          ipAddress: parts[4] || null,
          fingerprintAlgorithm: parts[5] || null,
          faceAlgorithm: parts[6] || null,
          totalFaces: parseInt(parts[7] || '0'),
          totalFacesEnrolled: parseInt(parts[8] || '0'),
          featureSupport: parts[9] || null,
        },
      });
    }

    const cmds = await this.prisma.command.findMany({
      where: { deviceId: device.id, status: 'pending' },
      orderBy: { id: 'asc' },
    });

    if (cmds.length === 0) {
      return 'OK';
    }

    const formatted = cmds.map((cmd) => {
      const command = `C:${cmd.id}:${cmd.command}`;
      this.logger.log(`Command ${device.serialNumber}>>> ${command}`);
      return command;
    });

    return formatted.join('\n');
  }

  async create(device?: Device, params?: PayloadParams) {
    if (!device) throw new NotFoundException('Device not found');

    // parsing body
    const payloads = { ...params, device };
    const result = await this.parseBodyResponse(payloads);

    // update stamp
    if (params?.query?.table === 'ATTLOG') {
      this.logger.log(`ATTLOG<<< ${device.serialNumber}`);

      const stamp = params.query.stamp || '0';
      await this.prisma.device.update({
        where: { id: device.id },
        data: { stamp: stamp },
      });
    }

    // update opstamp
    if (params?.query?.table === 'OPERLOG') {
      this.logger.log(`OPERLOG<<< ${device.serialNumber}`);

      const opstamp = params.query.opstamp || '0';
      await this.prisma.device.update({
        where: { id: device.id },
        data: { opStamp: opstamp },
      });
    }

    return result;
  }

  /**
   * Menangani respon command dari perangkat fingerprint.
   * Jika perintah adalah "INFO", informasi perangkat akan diperbarui di database.
   * @param device Perangkat iClock yang mengirim perintah
   * @param params Parameter yang diterima dari perangkat
   * @returns Respon berupa string
   */
  async command(device?: Device, params?: PayloadParams) {
    if (!device) return 'OK';

    const result = this.parseBodyCommand(params?.body);
    const ids = result.list?.map((i) => Number(i.id)).filter((n) => !isNaN(n));

    if (ids && ids.length > 0) {
      await this.prisma.command.updateMany({
        where: { id: { in: ids } },
        data: { status: 'finished', rawData: result.raw },
      });
    }

    const info = result.json?.cmd === 'INFO' ? result.json : null;

    if (info) {
      await this.prisma.device.update({
        where: { id: device.id },
        data: {
          model: info.devicename,
          firmwareVersion: info.fwversion,
          totalUsers: Number(info.usercount),
          totalFingerprints: Number(info.fpcount),
          totalAttendances: Number(info.transactioncount),
          ipAddress: info.ipaddress,
          macAddress: info.mac,
          fingerprintAlgorithm: info.algver,
          faceAlgorithm: info.faceversion,
          totalFaces: Number(info.maxfacecount),
          totalFacesEnrolled: Number(info.facecount),
          timezone: String(info.dtfmt),
          rawData: result.raw,
        },
      });
    }

    // untuk verifikasi jumlah data presensi
    const verify = result.json?.cmd === 'VERIFY SUM' ? result.json : null;
    if (verify && verify.attlogsum) {
      const attlogSum = parseInt(verify.attlogsum, 10);
      const startTime = verify.starttime;
      const endTime = verify.endtime;

      const attendanceCount = await this.prisma.attendance.count({
        where: {
          deviceId: device.id,
          timestamp: {
            gte: startTime,
            lte: endTime,
          },
        },
      });

      if (attlogSum > attendanceCount) {
        await this.prisma.command.create({
          data: {
            deviceId: device.id,
            command: `DATA QUERY ATTLOG StartTime=${startTime}\tEndTime=${endTime}`,
            status: 'pending',
          },
        });
      }
    }

    return 'OK';
  }

  /**
   * Melakukan parsing terhadap isi body menjadi pasangan key-value.
   *
   * **Fungsi ini menangani beberapa format khusus dari perangkat iClock:**
   * - Baris pertama dipisahkan menggunakan tanda `&`
   * - Baris berikutnya dipisahkan menggunakan tanda `=`
   * - Key yang diawali karakter `~` akan dihapus (`~serialnumber` → `serialnumber`)
   * - Key akan dinormalisasi menjadi huruf kecil (`lowercase`)
   *
   * @param body Isi body dalam bentuk `Buffer`, `string`, atau `null/undefined`
   * @returns Objek berisi pasangan key-value hasil parsing
   *
   * Contoh hasil parsing:
   * ```ts
   * {
   *   id: "3",
   *   return: "0",
   *   cmd: "INFO",
   *   devicename: "X100-C",
   *   serialnumber: "NJF7XXXX",
   *   mac: "00:xx:xx:xx:xx:xx",
   * }
   * ```
   */
  private parseBodyCommand(body?: Buffer | null): ResponseCommand {
    if (!body) return { json: null, list: [], raw: '' };

    const bodyStr = Buffer.isBuffer(body) ? body.toString('utf-8') : body;

    const lines = bodyStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const cmdInfo = bodyStr.includes('CMD=INFO');

    const normalizeKey = (key: string) =>
      key.replace(/^~+/, '').trim().toLowerCase();

    if (cmdInfo) {
      const obj: ResponseCommandInfo = {};

      lines.forEach((line, index) => {
        if (index === 0) {
          for (const part of line.split('&')) {
            const [key, value] = part.split('=');
            if (key && value) obj[normalizeKey(key)] = value.trim();
          }
          return;
        }

        const [key, value] = line.split('=');
        if (key && value) obj[normalizeKey(key)] = value.trim();
      });

      return {
        json: obj,
        list: [obj],
        raw: bodyStr,
      };
    }

    const list: ResponseCommandInfo[] = [];
    for (const line of lines) {
      const obj: ResponseCommandInfo = {};
      for (const part of line.split('&')) {
        const [key, value] = part.split('=');
        if (key && value) obj[normalizeKey(key)] = value.trim();
      }
      list.push(obj);
    }

    return {
      json: list[0] ?? null,
      list,
      raw: bodyStr,
    };
  }

  /**
   * Melakukan parsing terhadap body response dari perangkat fingerprint
   * berdasarkan tipe tabel yang diterima.
   * * Mendukung:
   * - ATTLOG  -> Simpan data presensi
   * - OPERLOG -> Update operation log + simpan OPLOG, TEMPLATE, USER INFO
   * @param table Nama tabel yang diterima dari parameter query (misalnya: "ATTLOG", "OPERLOG")
   * @param device Perangkat fingerprint yang mengirim data
   * @param body Isi body dalam bentuk `Buffer`, `string`, atau `null/undefined`
   * @returns Pesan hasil pemrosesan dalam bentuk string
   */
  private async parseBodyResponse(input: PayloadParams) {
    if (!input.device) return 'OK';
    if (!input.body) {
      this.logger.warn(
        `ICLOCK body empty SN=${input.device.serialNumber} table=${
          input.query?.table || '-'
        }`,
      );
      return 'OK';
    }

    const bodyStr = Buffer.isBuffer(input.body)
      ? input.body.toString('utf-8')
      : input.body;

    const table = input.query?.table || '';
    const lines = bodyStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    this.logger.log(
      `ICLOCK payload SN=${input.device.serialNumber} table=${
        table || '-'
      } lines=${lines.length} bytes=${Buffer.byteLength(bodyStr, 'utf-8')}`,
    );

    if (table === 'ATTLOG') {
      return await this.handleAttLog(input.device, lines);
    }

    if (table === 'OPERLOG' && /^OPLOG/i.test(bodyStr)) {
      return await this.saveDeviceOperationLog(input.device, lines);
    }

    // Template Fingerprint
    if (table === 'OPERLOG' && /^FP\s+PIN/i.test(bodyStr)) {
      return await this.saveTemplateFinger(input.device, lines);
    }

    // User Info
    if (table === 'OPERLOG' && /^USER\s+PIN/i.test(bodyStr)) {
      return await this.saveUserInfo(input.device, lines);
    }

    this.logger.warn(
      `ICLOCK ignored payload SN=${input.device.serialNumber} table=${
        table || '-'
      } firstLine=${(lines[0] || '').slice(0, 120)}`,
    );

    return 'OK';
  }

  private async handleAttLog(
    device?: Device,
    lines?: string[],
  ): Promise<string> {
    if (!device || !lines) return 'OK';
    const records: {
      deviceId: number;
      userId: string;
      timestamp: string;
      timestampUtc: Date | null;
      status: number;
      verify: number;
      workcode: number;
      rawData: string;
    }[] = [];

    let invalidLineCount = 0;

    lines.forEach((line) => {
      const value = line.split('\t');
      if (value.length >= 5) {
        records.push({
          deviceId: device.id,
          userId: value[0],
          timestamp: value[1], // datetime lokal perangkat
          timestampUtc: convertDeviceTimeUTC(value[1], device.timezone || 7), // UTC yang sudah dikonversi
          status: parseInt(value[2], 10),
          verify: parseInt(value[3], 10),
          workcode: parseInt(value[4], 10),
          rawData: line,
        });
        return;
      }

      invalidLineCount += 1;
    });

    this.logger.log(
      `ATTLOG parsed SN=${device.serialNumber} lines=${lines.length} records=${records.length} invalid=${invalidLineCount}`,
    );

    if (records.length === 0) {
      this.logger.warn(
        `ATTLOG skipped SN=${device.serialNumber} reason=no_valid_records firstLine=${(
          lines[0] || ''
        ).slice(0, 120)}`,
      );
      return `OK: ${lines.length}`;
    }

    await this.prisma.attendance.createMany({
      data: records,
      skipDuplicates: true,
    });

    this.logger.log(
      `ATTLOG saved SN=${device.serialNumber} records=${records.length}`,
    );

    // Jika url webhook tersedia, kirim data presensi
    if (device.webhookUrl) {
      const webhookUrl = device.webhookUrl;
      const payloads: AttendanceWebhookPayload[] = [];
      for (const record of records) {
        payloads.push({
          sn: device.serialNumber,
          user_id: record.userId,
          timestamp: record.timestamp,
          status: record.status,
          verify: record.verify,
          workcode: record.workcode,
        });
      }

      this.logger.log(
        `ATTLOG webhook queued SN=${device.serialNumber} records=${payloads.length} url=${webhookUrl}`,
      );

      // Kirim ke webhook dengan signature
      this.webhookService
        .sendBulkAttendanceWebhookSafe(
          webhookUrl,
          payloads,
          device.privateKey || '',
        )
        .catch((error) => {
          this.logger.error(`Webhook error: ${String(error)}`);
        });
    } else {
      this.logger.warn(
        `ATTLOG webhook skipped SN=${device.serialNumber} reason=webhook_url_empty`,
      );
    }

    return `OK: ${lines.length}`;
  }

  private async saveDeviceOperationLog(device: Device, lines: string[]) {
    const payloads: any[] = [];
    for (const line of lines) {
      const value = line.split('\t');
      if (value.length >= 5) {
        payloads.push({
          deviceId: device.id,
          userId: value[1],
          type: value[0],
          timestamp: value[2],
          timestampUtc: convertDeviceTimeUTC(value[2], device.timezone || 7),
          rawData: line,
        });
        const type = parseInt(value[0].replace(/\D+/g, ''), 10);
        const newUserId = value[3];
        switch (type) {
          case 9: // Hapus User
            await this.prisma.deviceUser.deleteMany({
              where: {
                userId: newUserId,
              },
            });
            await this.prisma.template.deleteMany({
              where: {
                userId: newUserId,
              },
            });
            break;
          case 30: // Tambah User
          case 4: // Ubah User
          case 36: // Ubah User
          case 70: // Ubah Nama User
          case 71: // Edit Hak Akses User
            await this.prisma.command.create({
              data: {
                deviceId: device.id,
                command: `DATA QUERY USERINFO PIN=${newUserId}`,
              },
            });
            break;
          default:
            break;
        }
      }
    }

    // Simpan data operation log
    await this.prisma.log.createMany({
      data: payloads,
      skipDuplicates: true,
    });

    return `OK: ${lines.length}`;
  }

  private async saveTemplateFinger(
    device: Device,
    lines: string[],
  ): Promise<string> {
    const parsedTemplates: {
      deviceId: number;
      userId: string;
      fid: string;
      size: number | null;
      valid: boolean;
      encode: string | null;
      rawData: string;
    }[] = [];
    const uniquePins = new Set<string>();

    for (const line of lines) {
      if (!line || line.trim().length === 0) continue;
      const items = line.split('\t');
      const parsed: Record<string, string> = {};
      for (const item of items) {
        // pecah menjadi key-value berdasarkan tanda '=' pertama (untuk menghindari base64 pada TMP)
        const index = item.indexOf('=');
        if (index === -1) continue;
        const key = item.substring(0, index).trim();
        const value = item.substring(index + 1).trim();
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        parsed[normalizedKey] = value.trim();
      }
      const pin = parsed['fp_pin'];
      const fid = parsed['fid'];
      if (!pin || !fid) continue;
      parsedTemplates.push({
        deviceId: device.id,
        userId: pin,
        fid,
        size:
          parsed['size'] && !isNaN(parseInt(parsed['size'], 10))
            ? parseInt(parsed['size'], 10)
            : null,
        valid:
          parsed['valid'] && !isNaN(parseInt(parsed['valid'], 10))
            ? Boolean(parseInt(parsed['valid'], 10))
            : false,
        encode: parsed['tmp'] || null,
        rawData: line,
      });
      uniquePins.add(pin);
    }

    // Upsert data template fingerprint
    await this.prisma.$transaction(
      parsedTemplates.map((t) =>
        this.prisma.template.upsert({
          where: {
            deviceId_userId_fid: {
              deviceId: t.deviceId,
              userId: t.userId,
              fid: t.fid,
            },
          },
          create: t,
          update: {
            size: t.size,
            valid: t.valid,
            encode: t.encode,
            rawData: t.rawData,
          },
        }),
      ),
    );

    const pins = Array.from(uniquePins);
    const createdCommands: {
      deviceId: number;
      command: string;
    }[] = [];

    for (const pin of pins) {
      const cmd = `DATA QUERY USERINFO PIN=${pin}`;
      const existingCommand = await this.prisma.command.findFirst({
        where: {
          deviceId: device.id,
          command: cmd,
          status: 'pending',
        },
      });
      if (!existingCommand) {
        createdCommands.push({
          deviceId: device.id,
          command: cmd,
        });
      }
    }

    if (createdCommands.length > 0) {
      await this.prisma.command.createMany({
        data: createdCommands,
      });
    }

    return `OK: ${lines.length}`;
  }

  private async saveUserInfo(device: Device, lines: string[]): Promise<string> {
    const parsedUsers: {
      deviceId: number;
      userId: string;
      name: string;
      privilege: number;
      password: string | null;
      mainCard: string | null;
      viceCard: string | null;
      group: number | null;
      template: string | null;
      verifyType: number | null;
      rawData: string;
    }[] = [];

    for (const line of lines) {
      const items = line.split('\t');
      const parsed: Record<string, string> = {};
      for (const item of items) {
        const [key, value] = item.split('=');
        if (key) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          parsed[normalizedKey] = value.trim();
        }
      }
      const pin = parsed['user_pin'];
      if (!pin) continue;
      parsedUsers.push({
        deviceId: device.id,
        userId: pin,
        name: parsed['name'] || '',
        privilege: parsed['pri'] ? parseInt(parsed['pri'], 10) : 0,
        password: parsed['passwd'] || null,
        mainCard: parsed['card'] || null,
        viceCard: parsed['vicecard'] || null,
        group: parsed['grp'] ? parseInt(parsed['grp'], 10) : null,
        template: parsed['tz'] || null,
        verifyType: parsed['verify'] ? parseInt(parsed['verify'], 10) : null,
        rawData: line,
      });
    }

    // Upsert data user
    await this.prisma.$transaction(
      parsedUsers.map((u) =>
        this.prisma.deviceUser.upsert({
          where: {
            deviceId_userId: {
              deviceId: u.deviceId,
              userId: u.userId,
            },
          },
          create: u,
          update: {
            ...u,
          },
        }),
      ),
    );

    return `OK: ${lines.length}`;
  }
}
