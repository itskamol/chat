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
  message: string
  createdAt: Date // Changed from string to Date
  updatedAt?: Date
  delivered?: boolean // For message sent/delivered status
}
