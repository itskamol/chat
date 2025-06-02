import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common'; // Import Logger

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // FR-GW-010: Provide standard CORS handling
  app.enableCors({
    // origin: 'http://localhost:3001', // Example: your frontend URL
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // credentials: true,
  });

  // It's good practice to use a prefix for all routes in the gateway, e.g. /gw
  // However, the TZ implies the gateway might handle existing paths directly.
  // If a prefix is desired: app.setGlobalPrefix('gw');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Gateway application is running on: http://localhost:${port}`
  );
}
bootstrap();
