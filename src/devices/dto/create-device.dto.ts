import { IsString, IsOptional, IsInt } from 'class-validator';
import { Prisma } from 'generated/prisma';

export class CreateDeviceDto {
  @IsString()
  serial_number: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  auth?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  webhook_url?: string;

  @IsOptional()
  @IsString()
  public_key?: string;

  @IsOptional()
  @IsString()
  private_key?: string;

  @IsOptional()
  @IsString()
  stamp?: string;

  @IsOptional()
  @IsString()
  op_stamp?: string;

  @IsOptional()
  @IsString()
  trans_times?: string;

  @IsOptional()
  @IsString()
  trans_flag?: string;

  @IsOptional()
  @IsString()
  encryption?: string;

  @IsOptional()
  @IsString()
  firmware_version?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  port_udp?: string;

  @IsOptional()
  @IsString()
  port_tcp?: string;

  @IsOptional()
  @IsInt()
  status_udp?: number;

  @IsOptional()
  @IsString()
  mac_address?: string;

  @IsOptional()
  @IsString()
  fingerprint_algorithm?: string;

  @IsOptional()
  @IsString()
  face_algorithm?: string;

  @IsOptional()
  @IsString()
  feature_support?: string;

  @IsOptional()
  @IsInt()
  error_delay?: number;

  @IsOptional()
  @IsInt()
  delay?: number;

  @IsOptional()
  @IsInt()
  trans_interval?: number;

  @IsOptional()
  @IsInt()
  realtime?: number;

  @IsOptional()
  @IsInt()
  timezone?: string;

  @IsOptional()
  @IsInt()
  total_users?: number;

  @IsOptional()
  @IsInt()
  total_fingerprints?: number;

  @IsOptional()
  @IsInt()
  total_attendances?: number;

  @IsOptional()
  @IsInt()
  total_faces?: number;

  @IsOptional()
  @IsInt()
  total_faces_enrolled?: number;

  @IsOptional()
  raw_data?: Prisma.InputJsonValue;

  @IsOptional()
  raw_json?: Prisma.InputJsonValue;
}
