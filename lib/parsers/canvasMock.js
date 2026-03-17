// Mock canvas module for pdfjs-dist in browser environment
// Only used for text extraction, doesn't need actual canvas functionality

class CanvasMock {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  getContext(contextType) {
    // Return mock context
    return {
      fillStyle: '',
      fillRect: () => {},
      drawImage: () => {},
      getImageData: () => ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      }),
    };
  }

  static createCanvas(width, height) {
    return new CanvasMock(width, height);
  }
}

// CommonJS export for Node.js require compatibility
module.exports = CanvasMock;
