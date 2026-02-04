"use client"

import { useSession } from "next-auth/react" // הייבוא החדש
import { CalendarDays, User, ShieldCheck, Loader2 } from "lucide-react"


interface AuditHeaderProps {
  inspectorName: string
}


// פונקציית עזר להמרת מספר לאותיות עבריות (גימטריה)
function numberToHebrew(num: number): string {
  if (num <= 0) return "";
  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת"];

  let result = "";

  // טיפול באלפים (עבור השנה - התשפ"ו)
  if (num >= 1000) {
    // בדרך כלל משמיטים את ה-ה' של האלפים בתאריך (תשפ"ו במקום ה'תשפ"ו)
    num %= 1000;
  }

  // מאות
  const h = Math.floor(num / 100);
  if (h > 4) {
    result += "ת" + numberToHebrew((h - 4) * 100);
  } else {
    result += hundreds[h];
  }
  num %= 100;

  // עשרות ויחידות (טיפול מיוחד ב-טו ו-טז)
  if (num === 15) return result + "טו";
  if (num === 16) return result + "טז";

  result += tens[Math.floor(num / 10)];
  result += units[num % 10];

  // הוספת גרשיים
  if (result.length > 1) {
    return result.slice(0, -1) + '"' + result.slice(-1);
  }
  return result;
}

export function AuditHeader({ inspectorName }: AuditHeaderProps) {
  const { data: session, status } = useSession()
  const today = new Date();
  // פונקציית עזר לקביעת האותיות הראשיות של השם
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };
  // חילוץ נתוני התאריך העברי מהדפדפן
  const parts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).formatToParts(today);

  const dayNum = parseInt(parts.find(p => p.type === 'day')?.value || "0");
  const monthName = parts.find(p => p.type === 'month')?.value || "";
  const yearNum = parseInt(parts.find(p => p.type === 'year')?.value || "0");

  const hebrewDateStr = `${numberToHebrew(dayNum)} ב${monthName} ה${numberToHebrew(yearNum)}`;
  const gregorianDate = today.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  const dayOfWeek = today.toLocaleDateString("he-IL", { weekday: "long" });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">ביקורת אכ"א</h1>
        </div>

        {/* האוואטר המקצועי עם ראשי תיבות */}
        <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-inner">
          {status === "loading" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            getInitials(session?.user?.name)
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-row justify-between items-end">
        {/* תאריך (צד ימין) */}
        <div className="flex items-start gap-2.5">
          <CalendarDays className="size-4 mt-0.5 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-foreground">{hebrewDateStr}</span>
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
              {dayOfWeek} | {gregorianDate}
            </span>
          </div>
        </div>

        {/* שם המבקר (צד שמאל) */}
        <div className="text-left">
          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">מבקר רשום:</p>
          <p className="text-xs font-bold text-foreground">
            {session?.user?.name || "ממתין להתחברות..."}
          </p>
        </div>
      </div>
    </header>
  )
}