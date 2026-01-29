import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

// הגדרת ה-Adapter עבור ה-Seed
const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

// יצירת הלקוח עם ה-Adapter
const prisma = new PrismaClient({ adapter })


async function main() {
  // ניקוי נתונים
  //await prisma.answer.deleteMany({});
  //await prisma.inspector.deleteMany({}); // תוסיף גם את זה!
  //await prisma.criterion.deleteMany({});
  //await prisma.category.deleteMany({});

  // 2. יצירת המבקרים
  console.log('Seeding inspectors...');
  await prisma.inspector.createMany({
    data: [
      { name: 'ישראל ישראלי' },
      { name: 'משה כהן' },
      { name: 'אבי לוי' },
      { name: 'דנה לוין' }
    ]
  });

  const categories = [
    { name: 'הלכה', order: 2, criteria: ['נספח הלכתי', 'התקני שבת', 'ערכת הבדלה', 'בית כנסת + עזרת נשים', 'ספרי תורה + מספר צבאי', 'עירוב', 'חגים', 'צומות', 'תפילות', 'מזוזות'] },
    { name: 'כשרות', order: 3, criteria: ['רכש חוץ', 'מערכת מכ"ם', 'הדרכת מכ"שים', 'שילוט', 'בקיאות טבחים ומכ"שים', 'סימונים', 'חירורים', 'אפיון כלים', 'טבילת כלים', 'דגים ובשר', 'אזרוח כשרות', 'פיקוח עבודות ובקרת כשרות', 'תשתיות מטבח', 'ברירה וניפוי', 'תבלינים', 'ציוד אירועים', 'התנהלות שבת', 'פיקוח שבת', 'קונדיטוריה', 'כוורת', 'מהדרין', 'בישול ישראל', 'הפשרת חלה', 'חדר מכ"ש', 'מטבחונים'] },
    { name: 'חירום', order: 4, criteria: ['חירום', 'תיק תא"ח', 'ערכת זה"ב', 'תרגול שבועי ערכת זה"ב', 'האם הטופס 246 הוא הטופס החדש'] },
    { name: 'רעו"ת ותוד"י', order: 5, criteria: ['ימי ישיבה', 'שיעורי תורה', 'הרצאות רב', 'ליווי שבתות', 'הדרכת ואישור מרצים', 'תוכנית זהות חתומה', 'סיורים', 'שת"פ חינוך רבנות'] },
    { name: 'ציוד ומחסנים', order: 6, criteria: ['מחסני מזון', 'מחסן פסח'] },
    { name: 'כ"א', order: 7, criteria: ['כ"א', 'תקינה סדיר', 'האם תקינת הנגד תואמת את הנחיות רבצ"ר'] },
    { name: 'שיחת חתך חיילים', order: 8, criteria: [{ label: 'כתוב נקודות שעלו בשיחת חתך עם החיילים מומלץ למספר', type: 'TEXT' }] },
    { name: 'סיכום', order: 9, criteria: [{ label: 'הערכת מבקר', type: 'TEXT' }, { label: 'המלצות מבקר', type: 'TEXT' }, { label: 'ציון', type: 'SCORE' }] }
  ]

  for (const cat of categories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        order: cat.order,
        criteria: {
          create: cat.criteria.map((c) => 
            typeof c === 'string' ? { label: c, type: 'RADIO' } : { label: c.label, type: c.type }
          )
        }
      }
    })
  }

  console.log('✅ הנתונים הוזנו בהצלחה!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());