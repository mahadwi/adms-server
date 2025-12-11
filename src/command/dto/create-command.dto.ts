import { Transform } from 'class-transformer';
import {
  IsString,
  ValidateIf,
  IsEnum,
  Matches,
  Max,
  Min,
  IsInt,
} from 'class-validator';
import { DeviceCommandType } from 'src/types/command.type';

export class CreateCommandDto {
  @IsEnum(DeviceCommandType)
  type: DeviceCommandType;

  @ValidateIf((o: CreateCommandDto) =>
    [
      DeviceCommandType.USER_INFO,
      DeviceCommandType.USER_EDIT,
      DeviceCommandType.USER_DELETE,
      DeviceCommandType.USER_CLONE,
      DeviceCommandType.USER_MOVE,
    ].includes(o.type),
  )
  @IsString()
  user_id?: string;

  @ValidateIf((o: CreateCommandDto) => o.type === DeviceCommandType.USER_EDIT)
  @IsString()
  name?: string;

  @ValidateIf((o: CreateCommandDto) => o.type === DeviceCommandType.USER_EDIT)
  @IsEnum(
    { 0: 0, 2: 2, 6: 6, 10: 10, 14: 14 },
    { message: 'group must be 0, 2, 6, 10, or 14' },
  )
  privilege?: number;

  @ValidateIf((o: CreateCommandDto) => o.type === DeviceCommandType.USER_EDIT)
  @Transform(({ value }) => String(value))
  @IsString()
  password?: string;

  @ValidateIf((o: CreateCommandDto) =>
    [DeviceCommandType.USER_CLONE, DeviceCommandType.USER_MOVE].includes(
      o.type,
    ),
  )
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return [String(value)];
  })
  @IsString({ each: true })
  device_target: string[];

  @ValidateIf(
    (o: CreateCommandDto) => o.type === DeviceCommandType.SET_TIMEZONE,
  )
  @IsString()
  @Matches(/^(\+|-)?\d{1,2}$/, {
    message: 'timezone must be a number like 7, +7, or -7',
  })
  timezone?: string;

  @ValidateIf((o: CreateCommandDto) => o.type === DeviceCommandType.SET_VOLUME)
  @IsInt({ message: 'volume must be an integer' })
  @Min(0, { message: 'volume must be between 0 and 100' })
  @Max(100, { message: 'volume must be between 0 and 100' })
  volume?: number;

  @ValidateIf(
    (o: CreateCommandDto) => o.type === DeviceCommandType.SET_LANGUAGE,
  )
  @IsInt({ message: 'language must be an integer' })
  @IsEnum({ 69: 69, 73: 73 }, { message: 'language must be 69 or 73' })
  language?: number;

  // attendance
  @ValidateIf((o: CreateCommandDto) =>
    [
      DeviceCommandType.ATTENDANCE_DOWNLOAD,
      DeviceCommandType.ATTENDANCE_VERIFY,
    ].includes(o.type),
  )
  @IsString()
  start_date?: string;

  @ValidateIf((o: CreateCommandDto) =>
    [
      DeviceCommandType.ATTENDANCE_DOWNLOAD,
      DeviceCommandType.ATTENDANCE_VERIFY,
    ].includes(o.type),
  )
  @IsString()
  end_date?: string;

  // command system
  @ValidateIf((o: CreateCommandDto) => o.type === DeviceCommandType.SHELL)
  @IsString()
  command?: string;
}
