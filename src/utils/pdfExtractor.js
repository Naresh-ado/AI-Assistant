import * as pdfjsLib from 'pdfjs-dist';

// Use standard CDN worker if local worker is not bundled
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts readable plain text from a PDF File or Blob
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 25); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      
      let lastY = null;
      let pageStr = '';

      for (const item of content.items) {
        if (!item.str) continue;
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageStr += '\n';
        } else if (pageStr.length > 0 && !pageStr.endsWith('\n') && !pageStr.endsWith(' ')) {
          pageStr += ' ';
        }
        pageStr += item.str;
        lastY = item.transform[5];
      }

      if (pageStr.trim()) {
        pageTexts.push(pageStr.trim());
      }
    }

    return pageTexts.join('\n\n');
  } catch (err) {
    console.warn('pdfjs-dist extraction notice:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        if (typeof text === 'string') {
          const printable = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ');
          resolve(printable.substring(0, 10000));
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }
}
