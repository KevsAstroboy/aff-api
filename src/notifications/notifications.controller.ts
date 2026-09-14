import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des notifications' })
  @ApiQuery({ name: 'unread_only', required: false, example: 'true' })
  @ApiResponse({ status: 200, description: 'Liste des notifications', type: [NotificationResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  list(
    @Request() req: AuthenticatedRequest,
    @Query('unread_only') unreadOnly?: string,
  ) {
    return this.notificationsService.list(req.user.sub, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiResponse({ status: 200, description: 'Count' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  unreadCount(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.unreadCount(req.user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 200, description: 'Marquée lue' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markRead(req.user.sub, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({ status: 200, description: 'Toutes marquées lues' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  markAllRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user.sub);
  }
}
