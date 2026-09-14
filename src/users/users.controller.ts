import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PortfolioService } from '../portfolio/portfolio.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly portfolioService: PortfolioService,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Profil public d\'un utilisateur',
    description: 'Retourne les informations publiques et les statistiques d\'un utilisateur.',
  })
  @ApiParam({ name: 'id', type: Number, example: 3 })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable',
    schema: { example: { message: 'Utilisateur introuvable', error: 'Not Found', statusCode: 404 } },
  })
  profile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findPublicProfile(id);
  }

  @Get(':id/portfolio')
  @ApiOperation({
    summary: 'Portfolio public d\'un utilisateur',
    description: 'Galerie d\'images du portfolio d\'un utilisateur (lecture seule).',
  })
  @ApiParam({ name: 'id', type: Number, example: 3 })
  @ApiResponse({ status: 200, description: 'Galerie portfolio' })
  portfolio(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.findAll(id);
  }
}
