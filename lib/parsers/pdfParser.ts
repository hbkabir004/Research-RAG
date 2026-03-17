export async function parsePDF(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source - use CDN for browser compatibility
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const textPages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct text with proper spacing
    let pageText = '';
    let lastY: number | null = null;
    let lastX: number | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5];
        const x = textItem.transform[4];

        if (lastY !== null && Math.abs(y - lastY) > 5) {
          // New line
          pageText += '\n';
        } else if (lastX !== null && x - lastX > 20) {
          // Gap between items on same line
          pageText += ' ';
        }

        pageText += textItem.str;
        lastY = y;
        lastX = x + (textItem.str.length * 6); // approximate width
      }
    }

    if (pageText.trim()) {
      textPages.push(`[Page ${pageNum}]\n${pageText.trim()}`);
    }
  }

  return {
    text: textPages.join('\n\n'),
    pageCount: pdf.numPages,
  };
}
