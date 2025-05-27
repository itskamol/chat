/**
 * @file MessageModel.ts
 * @description Defines the Mongoose schema and model for chat messages.
 * This model represents individual messages exchanged between users, which can be
 * text-based or include file attachments (images, videos, audio, generic files).
 * File metadata (URL, name, type, size, S3 key) is stored for non-text messages.
 */
import mongoose, { Schema, Document } from "mongoose";

/**
 * @enum Status
 * @description Represents the delivery and read status of a message.
 */
enum Status {
    NotDelivered = "NotDelivered", // Message has not yet been delivered to the recipient's server/client.
    Delivered = "Delivered",       // Message has been delivered to the recipient's server/client.
    Seen = "Seen",                 // Message has been seen by the recipient.
}

/**
 * @interface IMessage
 * @extends Document
 * @description TypeScript interface for a Message document, including Mongoose Document properties.
 * Defines the structure of a message object stored in MongoDB.
 */
export interface IMessage extends Document {
    senderId: string;       // ID of the user who sent the message.
    receiverId: string;     // ID of the user who received the message.
    message: string;        // Content of the text message, or caption for a file message.
                            // Can be a generic placeholder like "File: <filename>" if no caption is provided for a file.
    status: Status;         // Delivery and read status of the message.
    fileUrl?: string;       // URL to the uploaded file, provided by the file-service. Present if messageType is not 'text'.
    fileName?: string;      // Original name of the uploaded file, confirmed by file-service.
    fileMimeType?: string;  // MIME type of the uploaded file, confirmed by file-service (e.g., "image/jpeg").
    fileSize?: number;      // Size of the uploaded file in bytes, confirmed by file-service.
    storedFileName?: string;// The key used by file-service to store the file (e.g., S3 object key).
                            // This was previously named for local storage but now serves as the S3 key.
    originalMessage?: string;// Optional: Original text message if 'message' field is used as a caption for a file.
                             // Can also be used to store a user-provided caption.
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file'; // Type of the message, determining how it's handled/displayed.
    createdAt: Date;        // Timestamp of when the message was created.
    updatedAt: Date;        // Timestamp of when the message was last updated.
}

/**
 * @const MessageSchema
 * @description Mongoose schema definition for the Message model.
 */
const MessageSchema: Schema = new Schema(
    {
        senderId: { // ID of the user who sent the message
            type: String,
            required: true,
        },
        receiverId: { // ID of the user who received the message
            type: String,
            required: true,
        },
    message: { // Text content of the message or caption for a file
            type: String,
        required: false, // Not strictly required if it's purely a file message, but a caption or placeholder is good practice.
    },
    messageType: { // Discriminator for message content: 'text', 'image', 'video', 'audio', or 'file'
        type: String,
        default: 'text', 
            required: true,
        },
    fileUrl: { // URL of the uploaded file from file-service
        type: String,
        required: function(this: IMessage) { return this.messageType !== 'text'; }, // Required if not a text message
    },
    fileName: { // Original name of the file, as confirmed by file-service
        type: String,
        required: function(this: IMessage) { return this.messageType !== 'text'; },
    },
    fileMimeType: { // MIME type of the file, as confirmed by file-service
        type: String,
        required: function(this: IMessage) { return this.messageType !== 'text'; },
    },
    fileSize: { // Size of the file in bytes, as confirmed by file-service
        type: Number,
        required: function(this: IMessage) { return this.messageType !== 'text'; },
    },
    storedFileName: { // The key used by file-service to store the file (e.g., S3 object key)
        type: String,
        required: function(this: IMessage) { return this.messageType !== 'text'; },
    },
    originalMessage: { // Optional: User-provided caption or original text if 'message' is a placeholder
        type: String,
        required: false,
    },
        status: { // Delivery status of the message
            type: String,
            enum: Object.values(Status), // Ensures status is one of the defined enum values
            default: Status.NotDelivered,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);


// Ensure virtual fields are included when converting the document to JSON or a plain object
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });


/**
 * Pre-save hook for the MessageSchema.
 * 1. Ensures that if `messageType` is 'text', the `message` field is not empty.
 * 2. If the message is a file type and has no explicit caption (`message` field is empty),
 *    it sets a default placeholder message like "File: <fileName>".
 */
MessageSchema.pre<IMessage>('save', function (next) {
    if (this.messageType === 'text' && !this.message) {
        return next(new Error('Message content is required for text messages.'));
    }
    
    // For non-text messages, ensure essential file information is present.
    // The schema already makes fileUrl, fileName, etc., conditionally required.
    // This pre-save hook can add further validation or defaults if necessary.

    // If it's a file message and no explicit caption is provided, set a default message.
    if (this.messageType !== 'text' && this.fileUrl && !this.message && this.fileName) {
        this.message = `File: ${this.fileName}`; // Default placeholder message for files without captions
    }

    next();
});


const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;