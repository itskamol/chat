export interface User {
  _id: string
  name: string
  email: string
  online?: boolean
  lastSeen?: Date // Added for user status
}

export interface Message {
  _id?: string
  senderId: string
  receiverId: string
  message: string // Can be caption for files
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'; // Added
  fileUrl?: string; // Added
  fileName?: string; // Added
  fileMimeType?: string; // Added
  fileSize?: number; // Added
  originalMessage?: string; // Added for original text if message is repurposed for file caption
  createdAt: Date 
  updatedAt?: Date
  delivered?: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'failed' | 'uploading'; // Added/refined for more states
  uploadProgress?: number; // Added for file upload progress (0-100)
}
