// Extract text from PDF or DOCX files in the browser.
// PDF: pdfjs-dist (with worker via Vite ?url import).
// DOCX: mammoth.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite handles ?url asset imports
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(file);
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return await file.text();
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
}

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    pages.push(text);
  }
  return pages.join("\n\n").replace(/[ \t]+/g, " ").trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const { value } = await (mammoth as any).extractRawText({ arrayBuffer: buf });
  return (value as string).trim();
}
