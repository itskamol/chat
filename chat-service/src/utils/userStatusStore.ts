import logger from '@shared/utils/logger';

export class UserStatusStore {
    private static instance: UserStatusStore;
    private userStatuses: Record<string, boolean>;

    private constructor() {
        this.userStatuses = {};
        logger.debug('UserStatusStore initialized');
    }

    public static getInstance(): UserStatusStore {
        if (!UserStatusStore.instance) {
            UserStatusStore.instance = new UserStatusStore();
            logger.debug('Created new UserStatusStore instance');
        }
        return UserStatusStore.instance;
    }

    setUserOnline(userId: string) {
        this.userStatuses[userId] = true;
        logger.debug('User status set to online', { userId });
    }

    setUserOffline(userId: string) {
        this.userStatuses[userId] = false;
        logger.debug('User status set to offline', { userId });
    }

    isUserOnline(userId: string): boolean {
        const isOnline = !!this.userStatuses[userId];
        logger.debug('Checking user online status', { userId, isOnline });
        return isOnline;
    }
}