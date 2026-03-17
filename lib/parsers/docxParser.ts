export async function parseDOCX(buffer: ArrayBuffer): Promise<{ text: string }> {
  const mammoth = await import('mammoth');

  // Extract raw text with basic formatting preserved
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  let text = result.value;

  // Post-process to clean up and preserve structure
  text = text
    // Remove excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Fix common equation artifacts
    .replace(/\s+([=+\-*/^])\s+/g, ' $1 ')
    // Clean up whitespace
    .trim();

  if (result.messages && result.messages.length > 0) {
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message)
      .join(', ');

    if (warnings) {
      console.warn('DOCX parsing warnings:', warnings);
    }
  }

  return { text };
}

export async function parseDOCXWithMarkup(buffer: ArrayBuffer): Promise<{ html: string; text: string }> {
  const mammoth = await import('mammoth');

  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: buffer }),
    mammoth.extractRawText({ arrayBuffer: buffer }),
  ]);

  return {
    html: htmlResult.value,
    text: textResult.value,
  };
}
