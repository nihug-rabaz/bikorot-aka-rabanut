import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // וודא שהשורה הזו קיימת כדי לקרוא את ה-URL מה-env

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});