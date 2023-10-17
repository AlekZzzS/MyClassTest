import pkg from 'pg';
import { config } from 'dotenv';
config();

const { Client } = pkg

export const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

client.connect();