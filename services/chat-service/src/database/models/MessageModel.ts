import mongoose, { Schema } from 'mongoose';
import { Message as IMessage, MessageStatus, MessageType } from '@chat/shared';

/**
 * @const MessageSchema
 * @description Mongoose schema definition for the Message model.
 */
const MessageSchema: Schema = new Schema(
    {
        senderId: {
            // ID of the user who sent the message
            type: String,
            required: true,
        },
        receiverId: {
            // ID of the user who received the message
            type: String,
            required: true,
        },
        content: {
            // Text content of the message or caption for a file
            type: String,
            required: false, // Not strictly required if it's purely a file message, but a caption or placeholder is good practice.
        },
        type: {
            type: String,
            enum: Object.values(MessageType), // Enum for message types: 'text', 'image', 'video', 'audio', 'file'
            default: 'text',
            required: true,
        },
        fileUrl: {
            // URL of the uploaded file from file-service
            type: String,
            required: function (this: IMessage) {
                return this.type !== 'text';
            }, // Required if not a text message
        },
        fileName: {
            // Original name of the file, as confirmed by file-service
            type: String,
            required: function (this: IMessage) {
                return this.type !== 'text';
            },
        },
        fileMimeType: {
            // MIME type of the file, as confirmed by file-service
            type: String,
            required: function (this: IMessage) {
                return this.type !== 'text';
            },
        },
        fileSize: {
            // Size of the file in bytes, as confirmed by file-service
            type: Number,
            required: function (this: IMessage) {
                return this.type !== 'text';
            },
        },
        storedFileName: {
            // The key used by file-service to store the file (e.g., S3 object key)
            type: String,
            required: function (this: IMessage) {
                return this.type !== 'text';
            },
        },
        originalMessage: {
            // Optional: User-provided caption or original text if 'message' is a placeholder
            type: String,
            required: false,
        },
        status: {
            // Delivery status of the message
            type: String,
            enum: Object.values(MessageStatus),
            default: MessageStatus.NOT_DELIVERED,
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
 * 1. Ensures that if `type` is 'text', the `message` field is not empty.
 * 2. If the message is a file type and has no explicit caption (`message` field is empty),
 *    it sets a default placeholder message like "File: <fileName>".
 */
MessageSchema.pre<IMessage>('save', function (next) {
    if (this.type === 'text' && !this.type) {
        return next(
            new Error('Message content is required for text messages.')
        );
    }

    // For non-text messages, ensure essential file information is present.
    // The schema already makes fileUrl, fileName, etc., conditionally required.
    // This pre-save hook can add further validation or defaults if necessary.

    // If it's a file message and no explicit caption is provided, set a default message.
    if (
        this.type !== 'text' &&
        this.fileUrl &&
        !this.content &&
        this.fileName
    ) {
        this.content = `File: ${this.fileName}`; // Default placeholder message for files without captions
    }

    next();
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
