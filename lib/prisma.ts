import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// יצירת חיבור ישיר למסד הנתונים באמצעות החבילה pg
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter }) // פריזמה משתמשת ב-adapter במקום במנוע הפנימי שלה

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma