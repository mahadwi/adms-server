import { CMD, USHRT_MAX } from 'src/types/socket.type';
import { FileLoggerService } from '../logger/file-logger.service';

const logger = new FileLoggerService();

export function parseTimeToDate(time: number): Date {
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

export function parseHexToTime(hex: Buffer): Date {
  const time = {
    year: hex.readUIntLE(0, 1),
    month: hex.readUIntLE(1, 1),
    date: hex.readUIntLE(2, 1),
    hour: hex.readUIntLE(3, 1),
    minute: hex.readUIntLE(4, 1),
    second: hex.readUIntLE(5, 1),
  };

  return new Date(
    2000 + time.year,
    time.month - 1,
    time.date,
    time.hour,
    time.minute,
    time.second,
  );
}

export function createChkSum(buf: Buffer): number {
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i == buf.length - 1) {
      chksum += buf[i];
    } else {
      chksum += buf.readUInt16LE(i);
    }
    chksum %= USHRT_MAX;
  }
  chksum = USHRT_MAX - chksum - 1;

  return chksum;
}

export function createUDPHeader(
  command: number,
  sessionId: number,
  replyId: number,
  data: Buffer | undefined,
) {
  const dataBuffer = Buffer.from(data || Buffer.alloc(0));
  const buf = Buffer.alloc(8 + dataBuffer.length);

  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2);

  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  dataBuffer.copy(buf, 8);

  const chksum2 = createChkSum(buf);
  buf.writeUInt16LE(chksum2, 2);

  replyId = (replyId + 1) % USHRT_MAX;
  buf.writeUInt16LE(replyId, 6);

  return buf;
}

export function createTCPHeader(
  command: number,
  sessionId: number,
  replyId: number,
  data: string,
) {
  const dataBuffer = Buffer.from(data);
  const buf = Buffer.alloc(8 + dataBuffer.length);

  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2);

  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  dataBuffer.copy(buf, 8);

  const chksum2 = createChkSum(buf);
  buf.writeUInt16LE(chksum2, 2);

  replyId = (replyId + 1) % USHRT_MAX;
  buf.writeUInt16LE(replyId, 6);

  const prefixBuf = Buffer.from([
    0x50, 0x50, 0x82, 0x7d, 0x13, 0x00, 0x00, 0x00,
  ]);

  prefixBuf.writeUInt16LE(buf.length, 4);

  return Buffer.concat([prefixBuf, buf]);
}

export function removeTcpHeader(buf: Buffer): Buffer {
  if (buf.length < 8) {
    return buf;
  }

  if (buf.compare(Buffer.from([0x50, 0x50, 0x82, 0x7d]), 0, 4, 0, 4) !== 0) {
    return buf;
  }

  return buf.subarray(8);
}

export function decodeUserData28(userData: Buffer) {
  const user = {
    uid: userData.readUIntLE(0, 2),
    role: userData.readUIntLE(2, 1),
    name: userData
      .subarray(8, 8 + 8)
      .toString('ascii')
      .split('\0')
      .shift(),
    userId: userData.readUIntLE(24, 4),
  };
  return user;
}

export function decodeUserData72(userData: Buffer) {
  const user = {
    uid: userData.readUIntLE(0, 2),
    role: userData.readUIntLE(2, 1),
    password: userData
      .subarray(3, 3 + 8)
      .toString('ascii')
      .split('\0')
      .shift(),
    name: userData.subarray(11).toString('ascii').split('\0').shift(),
    cardno: userData.readUIntLE(35, 4),
    userId: userData
      .subarray(48, 48 + 9)
      .toString('ascii')
      .split('\0')
      .shift(),
  };
  return user;
}

export function decodeRecordData40(recordData: Buffer): {
  userSn: number;
  deviceUserId?: string;
  recordTime: Date;
} {
  const record = {
    userSn: recordData.readUIntLE(0, 2),
    deviceUserId: recordData
      .subarray(2, 2 + 9)
      .toString('ascii')
      .split('\0')
      .shift(),
    recordTime: parseTimeToDate(recordData.readUInt32LE(27)),
  };
  return record;
}

export function decodeRecordData16(recordData: Buffer): {
  deviceUserId: number;
  recordTime: Date;
} {
  const record = {
    deviceUserId: recordData.readUIntLE(0, 2),
    recordTime: parseTimeToDate(recordData.readUInt32LE(4)),
  };
  return record;
}

export function decodeRecordRealTimeLog18(recordData: Buffer) {
  const userId = recordData.readUIntLE(8, 1);
  const attTime = parseHexToTime(recordData.subarray(12, 18));
  return { userId, attTime };
}

export function decodeRecordRealTimeLog52(recordData: Buffer) {
  const payload = removeTcpHeader(recordData);

  const recvData = payload.subarray(8);

  const userId = recvData.subarray(0, 9).toString('ascii').split('\0').shift();

  const attTime = parseHexToTime(recvData.subarray(26, 26 + 6));

  return { userId, attTime };
}

export function decodeUDPHeader(header: Buffer) {
  const commandId = header.readUIntLE(0, 2);
  const checkSum = header.readUIntLE(2, 2);
  const sessionId = header.readUIntLE(4, 2);
  const replyId = header.readUIntLE(6, 2);
  return { commandId, checkSum, sessionId, replyId };
}

export function decodeTCPHeader(header: Buffer) {
  const recvData = header.subarray(8);
  const payloadSize = header.readUIntLE(4, 2);

  const commandId = recvData.readUIntLE(0, 2);
  const checkSum = recvData.readUIntLE(2, 2);
  const sessionId = recvData.readUIntLE(4, 2);
  const replyId = recvData.readUIntLE(6, 2);
  return { commandId, checkSum, sessionId, replyId, payloadSize };
}

export function exportErrorMessage(commandValue: number): string {
  const keys = Object.keys(CMD);
  for (let i = 0; i < keys.length; i++) {
    if (CMD[keys[i]] === commandValue) {
      return keys[i].toString();
    }
  }

  return 'AN UNKNOWN ERROR';
}

export function checkNotEventTCP(data: Buffer): boolean {
  try {
    data = removeTcpHeader(data);
    const commandId = data.readUIntLE(0, 2);
    const event = data.readUIntLE(4, 2);
    return event === CMD.EF_ATTLOG && commandId === CMD.REG_EVENT;
  } catch (err) {
    logger.error(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      `[228][CHECK_NOT_EVENT_TCP] : ${err.toString()}, ${data.toString('hex')} `,
    );
    return false;
  }
}

export function checkNotEventUDP(data: Buffer): boolean {
  const commandId = decodeUDPHeader(data.subarray(0, 8)).commandId;
  return commandId === CMD.REG_EVENT;
}

export function makeCommKey(
  key: number,
  sessionId: number,
  ticks = 50,
): number[] {
  // Ensure key and sessionId are integers
  key = Math.floor(key);
  sessionId = Math.floor(sessionId);

  let k = 0;

  // Reverse the bits of 'key'
  for (let i = 0; i < 32; i++) {
    if (key & (1 << i)) {
      k = (k << 1) | 1;
    } else {
      k = k << 1;
    }
  }

  // Add sessionId
  k += sessionId;

  // Convert to 4-byte buffer (Little Endian)
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, k, true);
  let bytes = new Uint8Array(buffer);

  // XOR with 'ZKSO'
  const xorKey = ['Z', 'K', 'S', 'O'].map((c) => c.charCodeAt(0));
  bytes = bytes.map((b, i) => b ^ xorKey[i]);

  // Swap 16-bit pairs
  const swapped = new Uint8Array([bytes[2], bytes[3], bytes[0], bytes[1]]);

  // Apply 'ticks' XOR transformation
  const B = ticks & 0xff;
  return [swapped[0] ^ B, swapped[1] ^ B, B, swapped[3] ^ B];
}
