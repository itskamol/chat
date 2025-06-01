export interface User {
  id: string; // Typically corresponds to _id in MongoDB
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
