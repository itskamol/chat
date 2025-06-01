import mongoose, { Schema, Document } from "mongoose";
import validator from "validator";

export interface IUser extends Document {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: {
            type: String,
            trim: true,
            required: [true, "Name must be provided"],
            minlength: 3,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, "Please provide a valid email."],
        },
        password: {
            type: String,
            trim: false,
            required: [true, "Password must be provided"],
            minlength: 8,
        },
    },
    {
        timestamps: true,
        id: true,
    }
);
UserSchema.virtual("id").get(function (this: IUser) {
    return (this as any)._id.toString();
});

UserSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password; // Exclude password from JSON output
        delete ret.__v; // Exclude version key from JSON output
        return ret;
    },
});

UserSchema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password; // Exclude password from object output
        delete ret.__v; // Exclude version key from object output
        return ret;
    },
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;