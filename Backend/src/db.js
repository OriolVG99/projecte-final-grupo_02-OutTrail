import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

//Configuracio de la connexio a la base de dades PostgreSQL amb Sequelize
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});