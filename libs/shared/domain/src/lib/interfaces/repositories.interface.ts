// User Repository Interface
export interface IUserRepository {
  create(user: Partial<any>): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  findByUsername(username: string): Promise<any | null>;
  update(id: string, updates: Partial<any>): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  findMany(filter: any, options?: { limit?: number; skip?: number; sort?: any }): Promise<any[]>;
  count(filter: any): Promise<number>;
  updateOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  findOnlineUsers(): Promise<any[]>;
}

// Message Repository Interface
export interface IMessageRepository {
  create(message: Partial<any>): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByRoomId(roomId: string, options?: { limit?: number; skip?: number }): Promise<any[]>;
  update(id: string, updates: Partial<any>): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  markAsRead(messageId: string, userId: string): Promise<void>;
  getUnreadCount(roomId: string, userId: string): Promise<number>;
  searchMessages(roomId: string, query: string, options?: any): Promise<any[]>;
}

// Room Repository Interface
export interface IRoomRepository {
  create(room: Partial<any>): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByUserId(userId: string): Promise<any[]>;
  update(id: string, updates: Partial<any>): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  addMember(roomId: string, userId: string, role?: string): Promise<void>;
  removeMember(roomId: string, userId: string): Promise<void>;
  updateMemberRole(roomId: string, userId: string, role: string): Promise<void>;
  isUserMember(roomId: string, userId: string): Promise<boolean>;
  updateLastActivity(roomId: string): Promise<void>;
}

// File Repository Interface
export interface IFileRepository {
  create(file: Partial<any>): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByUserId(userId: string, options?: any): Promise<any[]>;
  findByRoomId(roomId: string, options?: any): Promise<any[]>;
  update(id: string, updates: Partial<any>): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  incrementDownloadCount(id: string): Promise<void>;
}
