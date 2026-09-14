export const NOTIFICATION_EVENTS = {
  COMMENT_CREATED: 'comment.created',
  REACTION_TOGGLED: 'reaction.toggled',
  JURY_VOTE: 'jury.vote',
  CANDIDATURE_STATUT: 'candidature.statut',
} as const;

export interface CommentCreatedEvent {
  authorId: number;
  authorUsername: string;
  publicationOwnerId: number;
  publicationId: number;
}

export interface ReactionToggledEvent {
  authorId: number;
  authorUsername: string;
  publicationOwnerId: number;
  publicationId: number;
  reactionType: string;
}

export interface JuryVoteEvent {
  juryUserId: number;
  juryUsername: string;
  candidatUserId: number;
  candidatureId: number;
  categorieNom: string;
  score: number;
}

export interface CandidatureStatutEvent {
  candidatUserId: number;
  candidatureId: number;
  categorieNom: string;
  nouveauStatut: string;
}
