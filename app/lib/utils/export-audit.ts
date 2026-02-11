"use server"

import * as fs from "fs";
import * as path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  FrameAnchorType,
  FrameWrap,
  HeadingLevel,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  UnderlineType,
  VerticalAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  Header,
  PageNumber,
} from "docx"
import { prisma } from "@/lib/prisma"
import { formatHebrewDate } from "@/lib/hebrew-date"

interface ExportAuditContext {
  id: string
  unitName: string
  date: Date
  rabbiName: string
  rabbiRank: string
  rabbiIdNumber: string
  rabbiSeniority: number
  ncoName: string
  ncoRank: string
  ncoIdNumber: string
  ncoSeniority: number
  finalScore: string | null
  inspectorName: string
  additionalInspectors: string | null
  categories: {
    id: string
    name: string
    order: number
    items: {
      criterionLabel: string
      value: string | null
      comment: string | null
    }[]
  }[]
}

class ExportAuditService {
  async buildDocument(auditId: string) {
    const context = await this.loadContext(auditId);
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 400, right: 720, bottom: 720, left: 720 },
            },
          },
          headers: {
            default: this.createPageHeader(),
          },
          children: [
            ...this.buildHeaderAndTitle(context),
            ...this.buildGeneralInfo(context),
            new Paragraph({ spacing: { after: 600 } }),
            this.buildMainTable(context),
            this.buildFooter(),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  private createPageHeader() {
    const base = process.cwd();
    const topDocPath = path.join(base, "public", "top-doc.jpg");
    const topDocBuffer = fs.existsSync(topDocPath) ? fs.readFileSync(topDocPath) : null;

    const backgroundImage = topDocBuffer ? new ImageRun({
      data: topDocBuffer,
      type: "jpg",
      transformation: {
        width: 790, // רוחב שמתאים בדיוק בין השוליים
        height: 80
      },
      floating: {
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.PAGE,
          align: "center",
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.PAGE,
          offset: 0, // הצמדה מוחלטת לקצה העליון של הדף
        },
        wrap: { type: TextWrappingType.NONE },
        zIndex: 10,
      },
    }) : null;

    return new Header({
      children: [
        new Paragraph({
          // הפסקה הזו משמשת כעוגן לתמונה
          children: backgroundImage ? [backgroundImage] : [],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: this.noTableBorders(),
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 300 }, // ככל שהמספר גבוה יותר, הטקסט ירד נמוך יותר
                      children: [
                        new TextRun({ text: "עמודים ", font: "David", size: 20 }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "David", size: 20 }),
                        new TextRun({ text: " מתוך ", font: "David", size: 20 }),
                        new TextRun({ children: [PageNumber.CURRENT], font: "David", size: 20 }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 300 }, // ככל שהמספר גבוה יותר, הטקסט ירד נמוך יותר
                      children: [
                        new TextRun({ text: "סודי", bold: true, size: 24, font: "David" }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: [new Paragraph("")],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  private async loadContext(auditId: string): Promise<ExportAuditContext> {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        inspectors: true,
        creator: true,
        answers: {
          include: {
            criterion: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!audit) {
      throw new Error("Audit not found");
    }

    let inspectorName = audit.creator?.name ?? ""
    let additionalInspectors: string | null = null

    if (audit.creator) {
      const others = audit.inspectors
        .filter((i) => i.id !== audit.creatorId)
        .map((i) => i.name)
      additionalInspectors = others.length ? others.join(", ") : null
    } else if (audit.inspectors.length > 0) {
      inspectorName = audit.inspectors[0].name
      const rest = audit.inspectors.slice(1).map((i) => i.name)
      additionalInspectors = rest.length ? rest.join(", ") : null
    }

    const categoriesMap = new Map<string, ExportAuditContext["categories"][number]>();

    for (const answer of audit.answers) {
      const category = answer.criterion.category;
      const key = category.id;
      if (!categoriesMap.has(key)) {
        categoriesMap.set(key, {
          id: category.id,
          name: category.name,
          order: category.order,
          items: [],
        });
      }
      const bucket = categoriesMap.get(key)!;
      bucket.items.push({
        criterionLabel: answer.criterion.label,
        value: answer.value,
        comment: answer.comment,
      });
    }

    const categories = Array.from(categoriesMap.values()).sort(
      (a, b) => a.order - b.order,
    );

    return {
      id: audit.id,
      unitName: audit.unitName,
      date: audit.date,
      rabbiName: audit.rabbiName,
      rabbiRank: audit.rabbiRank,
      rabbiIdNumber: audit.rabbiIdNumber,
      rabbiSeniority: audit.rabbiSeniority,
      ncoName: audit.ncoName,
      ncoRank: audit.ncoRank,
      ncoIdNumber: audit.ncoIdNumber,
      ncoSeniority: audit.ncoSeniority,
      finalScore: audit.finalScore,
      inspectorName,
      additionalInspectors,
      categories,
    };
  }

  private buildHeaderAndTitle(context: ExportAuditContext): (Paragraph)[] {
    const base = process.cwd();
    const hadrachaPath = path.join(base, "public", "hadracha-logo.png");
    const rabanutPath = path.join(base, "public", "rabanut-logo.png");

    const hadrachaBuffer = fs.existsSync(hadrachaPath) ? fs.readFileSync(hadrachaPath) : null;
    const rabanutBuffer = fs.existsSync(rabanutPath) ? fs.readFileSync(rabanutPath) : null;

    const LOGO_SIZE = 90;
    const EMU_UNIT = 9144;
    const PAGE_WIDTH_EMU = 7500000;
    const OFFSET_FROM_TOP = 1400000;
    const OFFSET_FROM_SIDES = 600000;
    const LOGO_WIDTH_EMU = LOGO_SIZE * EMU_UNIT;

    const hadrachaImage = hadrachaBuffer ? new ImageRun({
      data: new Uint8Array(hadrachaBuffer),
      type: "png",
      transformation: { width: LOGO_SIZE + 25, height: LOGO_SIZE + 25 },//הוספתי 25 כי הלוגו של ההדרכה יצא קטן מידי
      floating: {
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.PAGE,
          offset: OFFSET_FROM_SIDES,
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.PAGE,
          offset: OFFSET_FROM_TOP,
        },
        wrap: { type: TextWrappingType.NONE },
        zIndex: 10,
        allowOverlap: true,
      } as any,
    }) : null;

    const rabanutImage = rabanutBuffer ? new ImageRun({
      data: new Uint8Array(rabanutBuffer),
      type: "png",
      transformation: { width: LOGO_SIZE, height: LOGO_SIZE },
      floating: {
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.PAGE,
          offset: PAGE_WIDTH_EMU - OFFSET_FROM_SIDES - LOGO_WIDTH_EMU,
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.PAGE,
          offset: OFFSET_FROM_TOP,
        },
        wrap: { type: TextWrappingType.NONE },
        zIndex: 10,
        allowOverlap: true,
      } as any,
    }) : null;

    const TWIPS_PER_EMU = 1440 / 914400;
    const titleFrameWidthTwips = 6000;
    const titleFrameHeightTwips = 400;
    const pageWidthTwips = Math.round(PAGE_WIDTH_EMU * TWIPS_PER_EMU);
    const titleXTwips = Math.round((pageWidthTwips - titleFrameWidthTwips) / 2);
    const logoCenterYEmu = OFFSET_FROM_TOP + (LOGO_SIZE * EMU_UNIT) / 2;
    const titleYTwips = Math.round(logoCenterYEmu * TWIPS_PER_EMU - titleFrameHeightTwips / 2);

    const year = context.date.getFullYear();
    const titleParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      frame: {
        type: "absolute",
        position: { x: titleXTwips, y: titleYTwips },
        width: titleFrameWidthTwips,
        height: titleFrameHeightTwips,
        anchor: {
          horizontal: FrameAnchorType.PAGE,
          vertical: FrameAnchorType.PAGE,
        },
        wrap: FrameWrap.NONE,
      } as any,
      children: [
        new TextRun({
          text: `הנדון: סיכום ביקורת אכ"א רבנות ${year} : ${context.unitName}`,
          font: "David",
          size: 32,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
      ],
    });

    const logoParagraph = new Paragraph({
      children: [
        ...(hadrachaImage ? [hadrachaImage] : []),
        ...(rabanutImage ? [rabanutImage] : []),
      ],
      spacing: { after: 2500 },
    });

    return [logoParagraph, titleParagraph];
  }

  private buildGeneralInfo(context: ExportAuditContext): (Paragraph | Table)[] {
    const scoreParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `ציון: ${context.finalScore ?? ""}`,
          font: "David",
          size: 28,
          bold: true,
        }),
      ],
    })

    const detailRows: TableRow[] = [
      this.generalInfoRow("מבקר", context.inspectorName),
    ]

    if (context.additionalInspectors) {
      detailRows.push(
        this.generalInfoRow("נוכחים בביקורת", context.additionalInspectors),
      )
    }

    const rabbiLine = [
      context.rabbiName,
      context.rabbiRank,
      context.rabbiIdNumber,
      `${context.rabbiSeniority} חודשים בתפקיד`,
    ].join(", ")

    const ncoLine = [
      context.ncoName,
      context.ncoRank,
      context.ncoIdNumber,
      `${context.ncoSeniority} חודשים בתפקיד`,
    ].join(", ")

    detailRows.push(
      this.generalInfoRow("רב היחידה", rabbiLine),
      this.generalInfoRow("נגד רבנות", ncoLine),
    )

    const gregorianDate = context.date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    // שימוש בסימן כיווניות RTL כדי לשמור את המספרים צמודים לתאריך העברי
    const dateLine = `${formatHebrewDate(context.date)} \u200F)${gregorianDate}(\u200F`

    detailRows.push(
      this.generalInfoRow(
        "תאריך ביקורת",
        dateLine,
      ),
    )

    const detailsTable = new Table({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: this.noTableBorders(),
      alignment: AlignmentType.CENTER,
      visuallyRightToLeft: true,
      rows: detailRows,
    })

    return [scoreParagraph, detailsTable]
  }

  private generalInfoRow(label: string, value: string) {
    return new TableRow({
      children: [
        new TableCell({
          borders: this.noBorders(),
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              bidirectional: true,
              spacing: {
                before: 100, // רווח מעל השורה
                after: 100,  // רווח מתחת לשורה
                // אפשר גם line אם רוצים ריווח בין שורות בתוך אותה פסקה
                // line: 276,
              },
              children: [
                new TextRun({
                  text: `${label}: `,
                  font: "David",
                  size: 24,
                  bold: true,
                }),
                new TextRun({
                  text: value,
                  font: "David",
                  size: 24,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  }

  private noTableBorders() {
    return {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    }
  }

  private buildMainTable(context: ExportAuditContext) {
    const rows: TableRow[] = []
    rows.push(
      new TableRow({
        children: [
          this.headerCell("פירוט הממצא", 45),
          this.headerCell("הנושא המבוקר", 18),
          this.headerCell("מס\"ד", 10),
        ],
      }),
    )

    let rowIndex = 1
    let itemIndex = 1
    for (const category of context.categories) {
      const content: TextRun[] = []

      for (const item of category.items) {
        if (content.length > 0) {
          content.push(new TextRun({ text: "", break: 1, font: "David" }))
        }

        content.push(
          new TextRun({
            text: `\u200f  ${itemIndex}. \u200f`,
            font: "David",
          }),
          new TextRun({
            text: item.criterionLabel,
            font: "David",
          }),
        )

        if (item.value) {
          const isBad = item.value === "לא תקין"
          content.push(
            new TextRun({ text: " - ", font: "David" }),
            new TextRun({
              text: item.value,
              color: isBad ? "FF0000" : "000000",
              font: "David",
            }),
          )
        }

        if (item.comment) {
          content.push(
            new TextRun({ text: "", break: 1, font: "David" }),
            new TextRun({ text: "\u200f      " + item.comment, font: "David" }),
          )
        }

        itemIndex += 1
      }

      rows.push(
        new TableRow({
          children: [
            this.dataCell(content, AlignmentType.LEFT, 45),
            this.dataCell(category.name, AlignmentType.CENTER, 18, true, 22),
            this.dataCell(String(rowIndex), AlignmentType.CENTER, 10, true, 22),
          ],
        }),
      )

      rowIndex += 1
    }

    return new Table({
      width: { size: 80, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows,
    })
  }

  // Helpers לטבלה כדי לקצר את הקוד
  private emptyShadedCell() {
    return new TableCell({
      borders: this.defaultBorders(),
      children: [new Paragraph({ bidirectional: true })],
      shading: { fill: "E5E5E5" },
    });
  }

  private categoryCell(name: string) {
    return new TableCell({
      borders: this.defaultBorders(),
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: name, bold: true, font: "David" })],
        }),
      ],
      shading: { fill: "E5E5E5" },
    });
  }

  private dataCell(
    content: string | TextRun[],
    alignment?: any,
    widthPercent?: number,
    bold?: boolean,
    fontSize?: number,
  ) {
    const cellAlignment = alignment ?? AlignmentType.RIGHT
    const size = fontSize ?? 21
    return new TableCell({
      borders: this.defaultBorders(),
      width: widthPercent
        ? { size: widthPercent, type: WidthType.PERCENTAGE }
        : undefined,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: cellAlignment,
          bidirectional: true,
          spacing: {
            before: 120,
            after: 120,
            line: 500,
          },
          children:
            typeof content === "string"
              ? [new TextRun({ text: content, font: "David", size, bold: bold ?? false })]
              : content,
        }),
      ],
    })
  }

  private headerCell(text: string, widthPercent?: number) {
    return new TableCell({
      borders: this.defaultBorders(),
      width: widthPercent
        ? { size: widthPercent, type: WidthType.PERCENTAGE }
        : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: "87CEEB" },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: {
            before: 120,
            after: 120,
          },
          children: [new TextRun({ text, bold: true, font: "David", size: 26 })],
        }),
      ],
    })
  }

  private buildFooter() {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, line: 500 },
      children: [
        new TextRun({ text: ',בברכה', break: 1, font: "David", size: 24 }),
        new TextRun({ text: 'סא"ל הרב יעקב נסים דדון', break: 1, font: "David", bold: true, size: 24 }),
        new TextRun({ text: 'רע"ן       הדרכה       ובקרה', break: 1, font: "David", bold: true, size: 24 }),
      ],
      bidirectional: true,
    })
  }

  private noBorders() {
    return {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    }
  }

  private defaultBorders() {
    return {
      top: { style: BorderStyle.SINGLE, size: 10, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 10, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 10, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 10, color: "000000" },
    }
  }
}

const service = new ExportAuditService()

export async function exportAuditToDocx(auditId: string) {
  return service.buildDocument(auditId)
}