import 'reflect-metadata';
import { AppDataSource } from './config/database';
import app from './app';
import Logger from './config/logger';

const PORT = process.env.PORT || 5000;

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    Logger.info('Database connection established');
    
    // Start server
    app.listen(PORT, () => {
      Logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    Logger.error('Error connecting to database:', error);
  });