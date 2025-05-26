import { IUser } from '../database/models/UserModel';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}
