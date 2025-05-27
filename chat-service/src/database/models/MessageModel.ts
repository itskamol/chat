import mongoose, { Schema } from "mongoose";
import { Message as IMessage, MessageStatus, MessageType } from "@chat/shared";

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
    type: {
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
        required: false, // Only required if type is not 'text' and storage is 'local'
    },
    originalMessage: { // Used if message field is repurposed, e.g. for a generic "File sent"
        type: String,
        required: false,
    },
        status: {
            type: String,
            enum: Object.values(MessageStatus),
            default: MessageStatus.NOT_DELIVERED,
        },
    },
    {
        timestamps: true,
    }
);


// Ensure virtuals are included in toJSON and toObject outputs
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });


// Pre-save hook to ensure 'message' field is present if type is 'text'
MessageSchema.pre<IMessage>('save', function (next) {
    if (this.type === 'text' && !this.type) {
        return next(new Error('Message content is required for text messages.'));
    }
    if (this.type !== 'text' && !this.fileUrl) {
        // For non-text messages, fileUrl should ideally be present.
        // This could be made more stringent if needed.
        // For now, allow it, as fileUrl might be set after some processing.
    }
    // if there is a file, and no message, set message to something generic like "File: [fileName]"
    if (this.fileUrl && !this.content && this.fileName) {
        this.content = `File: ${this.fileName}`;
    }

    next();
});


const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;