import mongoose, { Schema, Document } from "mongoose";

enum Status {
    NotDelivered = "NotDelivered",
    Delivered = "Delivered",
    Seen = "Seen",
}

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    message: string;
    status: Status;
    fileUrl?: string; // URL to the file if messageType is not 'text'
    fileName?: string; // Name of the file, if applicable
    fileMimeType?: string; // MIME type of the file, if applicable
    fileSize?: number; // Size of the file in bytes, if applicable
    storedFileName?: string; // For local storage, the filename used on disk
    originalMessage?: string; // Original message text if 'message' is repurposed for file messages
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file'; // Type of the message
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
    {
        senderId: {
            type: String,
            required: true,
        },
        receiverId: {
            type: String,
            required: true,
        },
    message: { // This will be the original text message if any, or a caption for the file
            type: String,
        required: false, // Not required if it's purely a file message, though often there's a caption
    },
    messageType: {
        type: String,
        default: 'text', // 'text', 'image', 'video', 'audio', 'file'
            required: true,
        },
    fileUrl: {
        type: String,
        required: false,
    },
    fileName: {
        type: String,
        required: false,
    },
    fileMimeType: {
        type: String,
        required: false,
    },
    fileSize: {
        type: Number,
        required: false,
    },
    storedFileName: { // Added for local storage to reliably link filename to message
        type: String,
        required: false, // Only required if messageType is not 'text' and storage is 'local'
    },
    originalMessage: { // Used if message field is repurposed, e.g. for a generic "File sent"
        type: String,
        required: false,
    },
        status: {
            type: String,
            enum: Object.values(Status),
            default: Status.NotDelivered,
        },
    },
    {
        timestamps: true,
    }
);


// Ensure virtuals are included in toJSON and toObject outputs
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });


// Pre-save hook to ensure 'message' field is present if messageType is 'text'
MessageSchema.pre<IMessage>('save', function (next) {
    if (this.messageType === 'text' && !this.message) {
        return next(new Error('Message content is required for text messages.'));
    }
    if (this.messageType !== 'text' && !this.fileUrl) {
        // For non-text messages, fileUrl should ideally be present.
        // This could be made more stringent if needed.
        // For now, allow it, as fileUrl might be set after some processing.
    }
    // if there is a file, and no message, set message to something generic like "File: [fileName]"
    if (this.fileUrl && !this.message && this.fileName) {
        this.message = `File: ${this.fileName}`;
    }

    next();
});


const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;