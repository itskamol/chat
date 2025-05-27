// import { User } from './user';
// import { Message } from './message';

export interface Room {
  id: string;
  name?: string;
  participantIds?: string[]; // List of user IDs
  isGroup?: boolean;
  lastMessage?: any; // Should be 'Message' type, placeholder for now
  createdAt?: Date;
  updatedAt?: Date;
}
