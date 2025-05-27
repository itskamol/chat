import { MessageType } from '../enums/message-type';
import { MessageStatus } from '../enums/message-status';
// import { User } from './user'; 

export interface Message {
  id: string;             // Corresponds to _id in MongoDB
  senderId: string;
  receiverId: string;
  chatId?: string;         // Optional: if messages are directly associated with a chat room ID
  content: string;        // Text content of the message or caption for a file
  type: MessageType;      // Use the MessageType enum
  timestamp: Date;        // Should ideally represent the creation time
  status: MessageStatus;    // Use the MessageStatus enum

  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  
  createdAt?: Date;
  updatedAt?: Date;
}
