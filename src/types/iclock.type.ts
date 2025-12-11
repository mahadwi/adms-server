import { Device } from 'generated/prisma';
export interface QueryParams {
  sn?: string;
  options?: string;
  language?: string;
  pushver?: string;
  info?: string;
  stamp?: string;
  opstamp?: string;
  table?: string;
  [key: string]: any;
}

export interface PayloadParams {
  query?: QueryParams;
  body?: Buffer | null;
  headers?: any;
  device?: Device;
}

export interface ResponseCommandInfo {
  id?: string;
  return?: string;
  cmd?: string;
  devicename?: string;
  mac?: string;
  transactioncount?: string;
  maxattlogcount?: string;
  usercount?: string;
  maxusercount?: string;
  photofunon?: string;
  maxuserphotocount?: string;
  userpicurlfunon?: string;
  fingerfunon?: string;
  algver?: string;
  fpversion?: string;
  maxfingercount?: string;
  fpcount?: string;
  facefunon?: string;
  faceversion?: string;
  maxfacecount?: string;
  facecount?: string;
  fvfunon?: string;
  fvversion?: string;
  maxfvcount?: string;
  fvcount?: string;
  pvfunon?: string;
  pvversion?: string;
  maxpvcount?: string;
  pvcount?: string;
  maintime?: string;
  flashsize?: string;
  freeflashsize?: string;
  language?: string;
  volume?: string;
  dtfmt?: string;
  ipaddress?: string;
  istft?: string;
  platform?: string;
  brightness?: string;
  backupdev?: string;
  oemvendor?: string;
  fwversion?: string;
  pushversion?: string;
  cardprotformat?: string;
  userphotocount?: string;
  attphotocount?: string;
  usercardcount?: string;
  zkfpversion?: string;
  serialnumber?: string;
  issupportnfc?: string;
  dstf?: string;
  reader1iostate?: string;
  attlogsum?: string;
  starttime?: string;
  endtime?: string;

  [key: string]: string | undefined;
}

export interface ResponseCommand {
  json: ResponseCommandInfo | null;
  list?: ResponseCommandInfo[];
  raw: string;
}
