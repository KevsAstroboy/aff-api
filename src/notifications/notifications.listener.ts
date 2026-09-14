import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  CommentCreatedEvent,
  ReactionToggledEvent,
  JuryVoteEvent,
  CandidatureStatutEvent,
} from './notifications.events';

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly service: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @OnEvent('comment.created')
  async handleComment(payload: CommentCreatedEvent) {
    if (payload.authorId === payload.publicationOwnerId) return;

    const notif = await this.service.create({
      user_id: payload.publicationOwnerId,
      type: 'comment',
      title: `${payload.authorUsername} a commenté votre publication`,
      link: `/publications/${payload.publicationId}`,
    });

    this.gateway.emitToUser(payload.publicationOwnerId, 'new_notification', notif);
  }

  @OnEvent('reaction.toggled')
  async handleReaction(payload: ReactionToggledEvent) {
    if (payload.authorId === payload.publicationOwnerId) return;

    const emoji = this.getReactionEmoji(payload.reactionType);
    const notif = await this.service.create({
      user_id: payload.publicationOwnerId,
      type: 'reaction',
      title: `${payload.authorUsername} a réagi à votre publication ${emoji}`,
      link: `/publications/${payload.publicationId}`,
    });

    this.gateway.emitToUser(payload.publicationOwnerId, 'new_notification', notif);
  }

  @OnEvent('jury.vote')
  async handleJuryVote(payload: JuryVoteEvent) {
    const notif = await this.service.create({
      user_id: payload.candidatUserId,
      type: 'award',
      title: `Un membre du jury a noté votre candidature "${payload.categorieNom}"`,
      body: `Score : ${payload.score}/100`,
      link: `/awards/candidatures/${payload.candidatureId}`,
    });

    this.gateway.emitToUser(payload.candidatUserId, 'new_notification', notif);
  }

  @OnEvent('candidature.statut')
  async handleCandidatureStatut(payload: CandidatureStatutEvent) {
    const notif = await this.service.create({
      user_id: payload.candidatUserId,
      type: 'award',
      title: `Votre candidature "${payload.categorieNom}" est maintenant "${payload.nouveauStatut}"`,
      link: `/awards/candidatures/${payload.candidatureId}`,
    });

    this.gateway.emitToUser(payload.candidatUserId, 'new_notification', notif);
  }

  private getReactionEmoji(reactionType: string): string {
    const map: Record<string, string> = {
      HEART: '❤️',
      CLAP: '👏',
      FIRE: '🔥',
      PARTY: '🎉',
    };
    return map[reactionType] ?? '';
  }
}
