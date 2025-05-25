import * as mediasoup from 'mediasoup';
import { Worker } from 'mediasoup/node/lib/types';
import { logger } from '../config/logger';
import { config } from '../config';

export class WorkerManager {
    private worker: Worker | null = null;

    async start(): Promise<Worker> {
        try {
            this.worker = await mediasoup.createWorker({
                logLevel: config.mediasoup.worker.logLevel,
                logTags: config.mediasoup.worker.logTags,
                rtcMinPort: config.mediasoup.worker.rtcMinPort,
                rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
            });

            logger.info('Mediasoup worker created successfully');

            this.worker.on('died', (error) => {
                logger.error('Mediasoup worker has died:', error);
                process.exit(1);
            });

            return this.worker;
        } catch (error) {
            logger.error('Error starting mediasoup worker:', error);
            process.exit(1);
        }
    }

    getWorker(): Worker | null {
        return this.worker;
    }

    async close() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
            logger.info('Mediasoup worker closed');
        }
    }
}
