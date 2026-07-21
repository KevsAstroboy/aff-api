import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { MessagerieService } from './messagerie.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messagerie')
@Controller('messagerie')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagerieController {
  constructor(private readonly messagerieService: MessagerieService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Conversations de l\'utilisateur',
    description:
      'Retourne toutes les conversations où l\'utilisateur est participant, avec aperçu du dernier message.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des conversations',
    type: [ConversationResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: { example: { message: 'Unauthorized', statusCode: 401 } },
  })
  findUserConversations(@Request() req: AuthenticatedRequest) {
    return this.messagerieService.findUserConversations(req.user.sub);
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Créer une conversation',
    description:
      'Crée une conversation directe (type_id=1) ou de groupe (type_id=2).',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation créée',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: { example: { message: ['type_id must be a number'], error: 'Bad Request', statusCode: 400 } },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: { example: { message: 'Unauthorized', statusCode: 401 } },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflit (données manquantes ou doublon)',
    schema: { example: { message: 'user2_id requis pour une conversation directe', error: 'Conflict', statusCode: 409 } },
  })
  create(@Body() dto: CreateConversationDto, @Request() req: AuthenticatedRequest) {
    return this.messagerieService.create(req.user.sub, dto);
  }

  @Get('conversations/get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getByCriteria(@Query() query: Record<string, string>) {
    return this.messagerieService.getByCriteria(query);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Détail d\'une conversation',
    description: 'Retourne une conversation avec ses participants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Détail de la conversation',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'L\'utilisateur ne fait pas partie de cette conversation',
    schema: {
      example: {
        message: 'Vous ne faites pas partie de cette conversation',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation introuvable',
    schema: { example: { message: 'Conversation introuvable', error: 'Not Found', statusCode: 404 } },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.messagerieService.findOne(id, req.user.sub);
  }

  @Post('conversations/:id/participants')
  @ApiOperation({
    summary: 'Ajouter un participant',
    description: 'Ajoute un utilisateur à une conversation de groupe.',
  })
  @ApiResponse({ status: 201, description: 'Participant ajouté' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'L\'utilisateur ne fait pas partie de cette conversation',
  })
  @ApiResponse({ status: 404, description: 'Conversation introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Déjà participant ou conversation directe',
    schema: {
      example: {
        message: 'Cet utilisateur est déjà participant',
        error: 'Conflict',
        statusCode: 409,
      },
    },
  })
  addParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Body('user_id', ParseIntPipe) userId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagerieService.addParticipant(id, userId, req.user.sub);
  }

  @Delete('conversations/:id/participants/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retirer un participant',
    description:
      'Retire un utilisateur d\'une conversation de groupe (admin ou soi-même).',
  })
  @ApiResponse({ status: 200, description: 'Participant retiré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Participant introuvable' })
  removeParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagerieService.removeParticipant(id, userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Messages d\'une conversation',
    description: 'Retourne les messages paginés d\'une conversation (MongoDB).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Liste paginée des messages' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'L\'utilisateur ne fait pas partie de cette conversation',
  })
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagerieService.getMessages(id, req.user.sub, page, limit);
  }
}
