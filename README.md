# מערכת ביקורות רבנות

אפליקציית Web בעברית לניהול ביקורות רבנות: יצירת ביקורת חדשה, מילוי קריטריונים, שמירת טיוטות, צפייה בהיסטוריית ביקורות, ניהול מבקרים, עריכת מבנה הטופס, עבודה חלקית במצב אופליין וייצוא ביקורת לקובץ Word.

הפרויקט בנוי על Next.js App Router, React, Prisma ו-PostgreSQL. הממשק מותאם RTL ועובד כ-PWA כדי לאפשר שימוש טוב יותר בשטח.

## התחלה מהירה

דרישות מומלצות:

- Node.js עדכני שמתאים ל-Next.js 16.
- pnpm, לפי `pnpm-lock.yaml` והגדרות `pnpm` בתוך `package.json`.
- PostgreSQL זמין דרך `DATABASE_URL`.
- פרויקט Google OAuth עבור התחברות עם NextAuth.

התקנה והרצה:

```bash
pnpm install
pnpm exec prisma migrate dev
pnpm dev
```

ברירת המחדל של Next.js היא:

```text
http://localhost:3000
```

פקודות שימושיות:

```bash
pnpm dev                 # שרת פיתוח
pnpm build               # build production
pnpm start               # הרצת build production
pnpm lint                # בדיקת ESLint
pnpm exec prisma studio  # צפייה ועריכת DB דרך Prisma Studio
```

## משתני סביבה

יש ליצור קובץ `.env` מקומי, בלי להכניס אליו סודות ל-git.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

הערות:

- `DATABASE_URL` נדרש גם לאפליקציה וגם לסקריפט הייבוא.
- התחברות מותרת רק למיילים שקיימים בטבלת `Inspector`.
- בסביבת production יש להגדיר `NEXTAUTH_URL` לכתובת האמיתית של האתר.

## מבנה הפרויקט

```text
app/                         נתיבי Next.js, Server Actions ו-API Routes
app/actions.ts               שמירה ועדכון של ביקורות
app/api/auth/[...nextauth]/  נקודת הכניסה של NextAuth
app/api/export/[id]/         ייצוא ביקורת ל-DOCX
app/api/offline-sync/        סנכרון נתוני אופליין מול השרת
app/admin/inspectors/        ניהול מבקרים והרשאות
app/admin/form-editor/       עריכת קטגוריות וקריטריונים בטופס
app/lib/offline/             Dexie, IndexedDB ומנוע סנכרון לקוח
app/lib/utils/export-audit.ts בניית קובץ Word
components/audit-form/       טופס הביקורת הראשי
components/audits/           רשימת ביקורות והיסטוריה
components/ui/               רכיבי UI משותפים
lib/                         Prisma, Auth, לוגים ועזרים כלליים
prisma/                      סכמת Prisma ומיגרציות
scripts/                     סקריפטים תפעוליים, כולל ייבוא AppSheet
public/                      אייקונים ונכסי PWA
```

## זרימות מרכזיות

### יצירת ביקורת

העמוד הראשי `/` טוען קטגוריות וקריטריונים פעילים מה-DB, יחד עם רשימת המבקרים, ומציג את `AuditForm`.

השמירה מתבצעת דרך `app/actions.ts`:

- `saveAudit` יוצר ביקורת חדשה.
- `updateAudit` מעדכן ביקורת קיימת.
- המבקר המחובר מתווסף אוטומטית לרשימת המבקרים של הביקורת.
- שדות הסיכום (`summaryEvaluation`, `recommendations`, `finalScore`) מחושבים מתוך קטגוריית `סיכום`.

### היסטוריית ביקורות

העמוד `/audits` מציג ביקורות קיימות:

- משתמש עם role `ADMIN` רואה את כל הביקורות.
- מבקר רגיל רואה ביקורות שהוא יצר או שובץ אליהן.
- ניתן לעדכן סטטוס, לנעול או לפתוח ביקורת, לשייך מבקרים ולייצא.

### ניהול מבקרים והרשאות

העמוד `/admin/inspectors` מיועד לאדמינים:

- הוספת מבקר עם שם, מייל ומספר אישי.
- שינוי role בין `ADMIN` ל-`INSPECTOR`.
- מחיקת מבקר.

חשוב: התחברות Google מצליחה רק אם המייל קיים בטבלת `Inspector`. לכן הוספת משתמש חדש למערכת מתחילה בהוספת מבקר.

### עריכת טופס

העמוד `/admin/form-editor` מאפשר לנהל את מבנה הטופס:

- יצירת קטגוריות.
- שינוי שמות וסדר קטגוריות.
- הוספת קריטריונים מסוג `RADIO`, `TEXT` או `SCORE`.
- שינוי סדר קריטריונים והעברתם בין קטגוריות.
- הסרה רכה של קריטריון באמצעות `isActive = false`.
- מחיקה לצמיתות רק אם אין תשובות היסטוריות לקריטריון.

קטגוריות וקריטריונים לא פעילים נשמרים כדי לא לשבור ביקורות היסטוריות.

## בסיס הנתונים

הסכמה נמצאת ב-`prisma/schema.prisma`.

מודלים עיקריים:

- `Audit` - ביקורת, סטטוס, נעילה, פרטים כלליים, סיכום ושיוך למבקרים.
- `Inspector` - מבקר, מייל, מספר אישי ו-role.
- `Category` - קטגוריית טופס.
- `Criterion` - קריטריון בתוך קטגוריה, כולל `type`, `order` ו-`isActive`.
- `Answer` - תשובה לקריטריון בתוך ביקורת. יש unique על `auditId + criterionId`.
- `User`, `Account`, `Session`, `VerificationToken` - מודלי NextAuth.
- `AppLog` - לוגים תפעוליים ואירועי מערכת.

פקודות Prisma נפוצות:

```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
pnpm exec prisma studio
```

## התחברות והרשאות

האפליקציה משתמשת ב-NextAuth עם Google Provider.

הקובץ המרכזי הוא `lib/auth.ts`:

- `signIn` בודק שהמייל של המשתמש קיים ב-`Inspector`.
- ה-role נלקח מתוך רשומת `Inspector`.
- ה-role נכנס ל-JWT ול-session.

אין כרגע `middleware` שמגן על כל הנתיבים ברמת request. לכן בדיקות הרשאה מתבצעות בעיקר בקוד העמודים והרכיבים. כשמוסיפים אזור רגיש חדש, צריך לוודא שיש בדיקת session/role בצד שרת ולא רק הסתרה בצד לקוח.

## אופליין ו-PWA

האפליקציה מוגדרת כ-PWA דרך `next-pwa` ב-`next.config.mjs`.

החלק המקומי עובד עם IndexedDB דרך Dexie:

- `app/lib/offline/db.ts` מגדיר את DB המקומי `BikorotOfflineDb`.
- `app/lib/offline/use-offline-audit.ts` מנהל טעינה ושמירה מקומית של ביקורת.
- `app/lib/offline/sync-engine.ts` שולח נתונים מלוכלכים לשרת ומושך עדכונים.
- `app/api/offline-sync/route.ts` מבצע upsert לנתונים ומחזיר snapshot עדכני.

מודל הסנכרון הוא Last Write Wins לפי `updatedAt`/`lastUpdated`. ביקורת חדשה לא נוצרת במצב אופליין מלא; המנגנון מיועד בעיקר להמשך עבודה על ביקורת שכבר קיימת ולשמירת שינויים מקומיים עד חזרת החיבור.

## ייצוא Word

ייצוא ביקורת מתבצע דרך:

```text
GET /api/export/[id]
```

הבנאי נמצא ב-`app/lib/utils/export-audit.ts` ומשתמש בספריית `docx`. הקובץ כולל נתוני ביקורת, מבקרים, קטגוריות, קריטריונים ותשובות. אם קיים `public/top-doc.jpg`, הוא משמש כתמונה עליונה במסמך.

## ייבוא AppSheet

הסקריפט `scripts/import-appsheet-v2.mjs` מייבא CSV היסטורי מ-AppSheet לתוך בסיס הנתונים.

הרצת dry-run:

```bash
pnpm import:appsheet -- --file path/to/file.csv
```

כתיבה אמיתית ל-DB:

```bash
pnpm import:appsheet -- --file path/to/file.csv --write
```

הסקריפט:

- מזהה פרופיל ייבוא `v1` או `v2` לפי כותרות ה-CSV.
- ממפה עמודות לקריטריונים קיימים.
- מנרמל ערכים כמו `כן`, `לא`, `ל"ר`.
- יוצר או מעדכן ביקורות לפי `externalId`.
- כותב דוח ל-`import-report.txt`.
- מפסיק כתיבה אם נמצאו שגיאות וללא `dry-run` תקין.

לפני ייבוא אמיתי מומלץ להריץ dry-run, לבדוק את `import-report.txt`, לוודא שאין `unmapped_column`, ורק אז להריץ עם `--write`.

## לוגים

המערכת כותבת אירועים לטבלת `AppLog` דרך `lib/logging/logger.ts`.

דוגמאות לאירועים:

- הצלחה או כשל בהתחברות.
- יצירה ועדכון ביקורת.
- פעולות ניהול מבקרים.
- שינוי מבנה טופס.
- כשל בייצוא.

לאדמין יש אפשרות להוריד לוגים דרך התפריט, דרך:

```text
/api/logs/export?days=30&format=csv
```

## בדיקות ואימות לפני שינוי

אין כרגע סט בדיקות אוטומטי ייעודי בפרויקט. לפני שינוי משמעותי כדאי להריץ לפחות:

```bash
pnpm lint
pnpm build
```

לאחר שינוי ב-DB:

```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

בדיקות ידניות מומלצות:

- התחברות עם משתמש שקיים ב-`Inspector`.
- יצירת ביקורת חדשה ושמירה.
- עריכת ביקורת קיימת.
- נעילה ופתיחה של ביקורת.
- ייצוא DOCX.
- עבודה קצרה ללא רשת וחזרה לרשת לסנכרון.
- שינוי קריטריון בטופס ובדיקה שביקורות היסטוריות לא נשברות.

## נקודות תחזוקה חשובות

- לא למחוק קריטריונים עם תשובות היסטוריות. השתמשו ב-`isActive = false`.
- שינוי שם קריטריון בקטגוריית `סיכום` יכול להשפיע על חישוב `summaryEvaluation`, `recommendations` ו-`finalScore`.
- שינוי מבנה ה-CSV של AppSheet דורש עדכון מיפויים ב-`scripts/import-appsheet-v2.mjs`.
- הרשאות אדמין נשענות על `Inspector.role`; ודאו שבדיקות צד שרת קיימות בכל יכולת ניהול חדשה.
- יש גם `package-lock.json` וגם `pnpm-lock.yaml`. בפועל הפרויקט מכוון ל-pnpm, ולכן עדיף לשמור על שימוש עקבי ב-pnpm כדי למנוע שינויי lockfile מיותרים.
- `next.config.mjs` מוגדר עם `typescript.ignoreBuildErrors = true`; לכן build יכול לעבור גם כשיש שגיאות TypeScript. מומלץ לא להסתמך על זה כבדיקת תקינות מלאה.

