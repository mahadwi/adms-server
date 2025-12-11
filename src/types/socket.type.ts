/**
 * ZKTeco Socket Protocol Constants
 * Combined CMD + REQUEST_DATA + MAX/USHRT constants
 * @source https://github.com/adrobinoga/zk-protocol/blob/master/protocol.md
 */

export const USHRT_MAX = 65535;
export const MAX_CHUNK = 65472;

export const CMD = {
  // Connection / Session
  CONNECT: 1000,
  EXIT: 1001,
  ENABLEDEVICE: 1002,
  DISABLEDEVICE: 1003,
  RESTART: 1004,
  POWEROFF: 1005,
  SLEEP: 1006,
  RESUME: 1007,

  // Fingerprint / Image
  CAPTUREFINGER: 1009,
  TEST_TEMP: 1011,
  CAPTUREIMAGE: 1012,
  REFRESHDATA: 1013,
  REFRESHOPTION: 1014,
  TESTVOICE: 1017,

  // Firmware / Communication
  GET_VERSION: 1100,
  CHANGE_SPEED: 1101,
  AUTH: 1102,

  // Data Transmission
  PREPARE_DATA: 1500,
  DATA: 1501,
  FREE_DATA: 1502,
  DATA_WRRQ: 1503,
  DATA_RDY: 1504,

  // User / Template / Options
  DB_RRQ: 7,
  USER_WRQ: 8,
  USERTEMP_RRQ: 9,
  USERTEMP_WRQ: 10,
  OPTIONS_RRQ: 11,
  OPTIONS_WRQ: 12,

  // Attendance
  ATTLOG_RRQ: 13,
  CLEAR_DATA: 14,
  CLEAR_ATTLOG: 15,

  // User / Admin / Finger
  DELETE_USER: 18,
  DELETE_USERTEMP: 19,
  CLEAR_ADMIN: 20,

  USERGRP_RRQ: 21,
  USERGRP_WRQ: 22,
  USERTZ_RRQ: 23,
  USERTZ_WRQ: 24,
  GRPTZ_RRQ: 25,
  GRPTZ_WRQ: 26,
  TZ_RRQ: 27,
  TZ_WRQ: 28,

  // Access control
  ULG_RRQ: 29,
  ULG_WRQ: 30,
  UNLOCK: 31,
  CLEAR_ACC: 32,
  CLEAR_OPLOG: 33,
  OPLOG_RRQ: 34,

  // Device info
  GET_FREE_SIZES: 50,
  ENABLE_CLOCK: 57,
  STARTVERIFY: 60,
  STARTENROLL: 61,
  CANCELCAPTURE: 62,
  STATE_RRQ: 64,

  // Display / LCD
  WRITE_LCD: 66,
  CLEAR_LCD: 67,

  // User PIN / Messages / UData
  GET_PINWIDTH: 69,
  SMS_WRQ: 70,
  SMS_RRQ: 71,
  DELETE_SMS: 72,
  UDATA_WRQ: 73,
  DELETE_UDATA: 74,

  // Door & Mifare
  DOORSTATE_RRQ: 75,
  WRITE_MIFARE: 76,
  EMPTY_MIFARE: 78,

  CHECKSUM_BUFFER: 119,
  TMP_WRITE: 87,
  VERIFY_WRQ: 79,
  VERIFY_RRQ: 80,
  DEL_FPTMP: 134,

  // Time
  GET_TIME: 201,
  SET_TIME: 202,

  // Realtime event registration
  REG_EVENT: 500,

  // Reply codes
  ACK_OK: 2000,
  ACK_ERROR: 2001,
  ACK_DATA: 2002,
  ACK_RETRY: 2003,
  ACK_REPEAT: 2004,
  ACK_UNAUTH: 2005,

  ACK_UNKNOWN: 65535,
  ACK_ERROR_CMD: 65533,
  ACK_ERROR_INIT: 65532,
  ACK_ERROR_DATA: 65531,

  // Realtime Event Codes
  EF_ATTLOG: 1,
  EF_FINGER: 2,
  EF_ENROLLUSER: 4,
  EF_ENROLLFINGER: 8,
  EF_BUTTON: 16,
  EF_UNLOCK: 32,
  EF_VERIFY: 128,
  EF_FPFTR: 256,
  EF_ALARM: 512,
} as const;

export type SocketCMD = typeof CMD;

export const REQUEST_DATA = {
  DISABLE_DEVICE: Buffer.from([0x00, 0x00, 0x00, 0x00]),

  GET_REAL_TIME_EVENT: Buffer.from([0x01, 0x00, 0x00, 0x00]),

  GET_ATTENDANCE_LOGS: Buffer.from([
    0x01, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]),

  GET_USERS: Buffer.from([
    0x01, 0x09, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]),
} as const;

export type RequestData = typeof REQUEST_DATA;
