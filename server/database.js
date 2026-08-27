import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'taskdb',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'admin123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5435', 10),
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Task Management Database connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Unable to connect to PostgreSQL Task Management Database:', error.message);
    return false;
  }
}

export default sequelize;
