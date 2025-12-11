import { PartialType } from '@nestjs/mapped-types';
import { CreateIclockDto } from './create-iclock.dto';

export class UpdateIclockDto extends PartialType(CreateIclockDto) {}
