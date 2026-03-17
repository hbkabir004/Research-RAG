// PDF parser using pdfjs-dist with proper canvas handling
export async function parsePDF(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only supported in the browser');
  }

  try {
    // Use dynamic import with proper error handling
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source for browser
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    const textPages: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Yield to main thread every page
      await new Promise(resolve => setTimeout(resolve, 0));

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
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
