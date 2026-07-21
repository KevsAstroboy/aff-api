import { PartialType } from '@nestjs/swagger';
import { CreateCommunauteDto } from './create-communaute.dto';

export class UpdateCommunauteDto extends PartialType(CreateCommunauteDto) {}
