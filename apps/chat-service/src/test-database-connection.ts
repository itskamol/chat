import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '@chat/shared/infrastructure';

async function testDatabaseConnection() {
  const app = await NestFactory.createApplicationContext(DatabaseModule);
  try {
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await app.close();
  }
}

testDatabaseConnection();
