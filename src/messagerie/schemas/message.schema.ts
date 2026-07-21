import * as mongoose from 'mongoose';

export const MessageSchema = new mongoose.Schema(
  {
    conversation_id: { type: Number, required: true, index: true },
    sender_id: { type: Number, required: true },
    contenu: { type: String, required: true },
    attachment_url: { type: String, default: null },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    sent_at: { type: Date, default: Date.now },
  },
  { collection: 'messages', timestamps: false },
);

export interface Message {
  _id: mongoose.Types.ObjectId;
  conversation_id: number;
  sender_id: number;
  contenu: string;
  attachment_url?: string;
  type: string;
  sent_at: Date;
}
