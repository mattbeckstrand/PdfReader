// ===================================================================
// OCR Service for Mathematical Content Recognition
// ===================================================================

import { MathRegion } from './mathDetection';

// ===================================================================
// Type Definitions
// ===================================================================

export interface OCRResult {
  latex: string;
  plainText: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  mathml?: string;
  processingTime: number;
}

export interface OCRError {
  code: string;
  message: string;
  recoverable: boolean;
}

interface MathpixResponse {
  latex_styled?: string;
  latex_normal?: string;
  text?: string;
  mathml?: string;
  confidence?: number;
  error?: string;
  detection_map?: any;
}

// ===================================================================
// OCR Service Class
// ===================================================================

export class MathOCRService {
  private readonly baseUrl = 'https://api.mathpix.com/v3/text';
  private readonly appId: string;
  private readonly appKey: string;
  private readonly cache = new Map<string, OCRResult>();
  private readonly maxCacheSize = 100;

  constructor(appId?: string, appKey?: string) {
    // In a real implementation, these would come from environment variables or settings
    // For now, we'll check if global environment variables are available (Electron)
    const envAppId = (globalThis as any)?.process?.env?.MATHPIX_APP_ID;
    const envAppKey = (globalThis as any)?.process?.env?.MATHPIX_APP_KEY;
    
    this.appId = appId || envAppId || '';
    this.appKey = appKey || envAppKey || '';
    
    if (!this.appId || !this.appKey) {
      console.warn('⚠️ Mathpix credentials not configured. OCR will use fallback text extraction.');
    }
  }

  /**
   * Check if OCR service is properly configured
   */
  public isConfigured(): boolean {
    return Boolean(this.appId && this.appKey);
  }

  /**
   * Process mathematical equation from image data
   */
  async processEquation(
    imageData: ImageData,
    bbox: { x: number; y: number; width: number; height: number },
    mathRegion?: MathRegion
  ): Promise<OCRResult> {
    const startTime = performance.now();

    try {
      // Generate cache key from image data hash
      const cacheKey = await this.generateImageHash(imageData);

      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        console.log('🎯 OCR cache hit for equation');
        return cached;
      }

      let result: OCRResult;

      if (this.isConfigured()) {
        // Use Mathpix API
        result = await this.processWithMathpix(imageData, bbox);
      } else {
        // Fallback to basic processing
        result = await this.fallbackProcessing(imageData, bbox, mathRegion);
      }

      result.processingTime = performance.now() - startTime;

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;

    } catch (error) {
      console.error('❌ OCR processing failed:', error);

      // Return fallback result
      return {
        latex: '',
        plainText: mathRegion?.elements[0]?.textContent || 'Error processing equation',
        confidence: 0,
        bbox,
        processingTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Process equation using Mathpix API
   */
  private async processWithMathpix(
    imageData: ImageData,
    bbox: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    // Convert ImageData to base64
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.putImageData(imageData, 0, 0);
    const base64Image = canvas.toDataURL('image/png').split(',')[1];

    // Prepare request
    const requestBody = {
      src: `data:image/png;base64,${base64Image}`,
      formats: ['latex_normal', 'latex_styled', 'text', 'mathml'],
      data_options: {
        include_latex: true,
        include_mathml: true,
        include_line_data: false,
        include_word_data: false,
      },
      math_inline_delimiters: ['$', '$'],
      math_display_delimiters: ['$$', '$$'],
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'app_id': this.appId,
        'app_key': this.appKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Mathpix API error: ${response.status} ${response.statusText}`);
    }

    const data: MathpixResponse = await response.json();

    if (data.error) {
      throw new Error(`Mathpix processing error: ${data.error}`);
    }

    // Parse response
    const latex = data.latex_styled || data.latex_normal || '';
    const plainText = data.text || this.latexToPlainText(latex);
    const confidence = data.confidence || 0.8; // Mathpix typically has high confidence
    const mathml = data.mathml || '';

    return {
      latex: this.cleanLatex(latex),
      plainText: plainText.trim(),
      confidence: Math.min(confidence, 1.0),
      mathml,
      bbox,
      processingTime: 0, // Will be set by caller
    };
  }

  /**
   * Fallback processing when Mathpix is not available
   */
  private async fallbackProcessing(
    imageData: ImageData,
    bbox: { x: number; y: number; width: number; height: number },
    mathRegion?: MathRegion
  ): Promise<OCRResult> {
    // Note: imageData is not used in fallback but kept for interface consistency
    console.log(`📊 Fallback OCR processing for region ${bbox.width}x${bbox.height}`);
    
    // Extract text from DOM elements if available
    let plainText = '';
    let confidence = 0.3; // Lower confidence for fallback
    
    if (mathRegion?.elements && mathRegion.elements.length > 0) {
      plainText = mathRegion.elements
        .map(el => el.textContent || '')
        .join(' ')
        .trim();
      
      confidence = Math.min(mathRegion.confidence * 0.7, 0.6); // Reduce confidence
    }

    // Basic pattern-based LaTeX conversion
    const latex = this.textToBasicLatex(plainText);

    return {
      latex,
      plainText,
      confidence,
      bbox,
      processingTime: 0, // Will be set by caller
    };
  }

  /**
   * Convert basic mathematical text to LaTeX
   */
  private textToBasicLatex(text: string): string {
    if (!text) return '';

    let latex = text;

    // Replace common symbols
    const replacements: [RegExp, string][] = [
      [/∞/g, '\\infty'],
      [/±/g, '\\pm'],
      [/∓/g, '\\mp'],
      [/≠/g, '\\neq'],
      [/≈/g, '\\approx'],
      [/≡/g, '\\equiv'],
      [/≤/g, '\\leq'],
      [/≥/g, '\\geq'],
      [/∝/g, '\\propto'],
      [/√/g, '\\sqrt'],
      [/∫/g, '\\int'],
      [/∑/g, '\\sum'],
      [/∏/g, '\\prod'],
      [/∂/g, '\\partial'],
      [/∇/g, '\\nabla'],
      [/∆/g, '\\Delta'],
      [/α/g, '\\alpha'],
      [/β/g, '\\beta'],
      [/γ/g, '\\gamma'],
      [/δ/g, '\\delta'],
      [/ε/g, '\\epsilon'],
      [/θ/g, '\\theta'],
      [/λ/g, '\\lambda'],
      [/μ/g, '\\mu'],
      [/π/g, '\\pi'],
      [/ρ/g, '\\rho'],
      [/σ/g, '\\sigma'],
      [/τ/g, '\\tau'],
      [/φ/g, '\\phi'],
      [/ω/g, '\\omega'],
      // Superscripts and subscripts (basic detection)
      [/\^([0-9a-zA-Z]+)/g, '^{$1}'],
      [/_([0-9a-zA-Z]+)/g, '_{$1}'],
    ];

    for (const [pattern, replacement] of replacements) {
      latex = latex.replace(pattern, replacement);
    }

    return latex;
  }

  /**
   * Convert LaTeX to plain text for display
   */
  private latexToPlainText(latex: string): string {
    if (!latex) return '';

    let plainText = latex;

    // Remove LaTeX commands and replace with readable text
    const replacements: [RegExp, string][] = [
      [/\\infty/g, '∞'],
      [/\\pm/g, '±'],
      [/\\mp/g, '∓'],
      [/\\neq/g, '≠'],
      [/\\approx/g, '≈'],
      [/\\equiv/g, '≡'],
      [/\\leq/g, '≤'],
      [/\\geq/g, '≥'],
      [/\\propto/g, '∝'],
      [/\\sqrt\{([^}]+)\}/g, '√($1)'],
      [/\\int/g, '∫'],
      [/\\sum/g, '∑'],
      [/\\prod/g, '∏'],
      [/\\partial/g, '∂'],
      [/\\nabla/g, '∇'],
      [/\\Delta/g, '∆'],
      [/\\alpha/g, 'α'],
      [/\\beta/g, 'β'],
      [/\\gamma/g, 'γ'],
      [/\\delta/g, 'δ'],
      [/\\epsilon/g, 'ε'],
      [/\\theta/g, 'θ'],
      [/\\lambda/g, 'λ'],
      [/\\mu/g, 'μ'],
      [/\\pi/g, 'π'],
      [/\\rho/g, 'ρ'],
      [/\\sigma/g, 'σ'],
      [/\\tau/g, 'τ'],
      [/\\phi/g, 'φ'],
      [/\\omega/g, 'ω'],
      // Remove braces around single characters
      [/\{([^}])\}/g, '$1'],
      // Clean up extra spaces
      [/\s+/g, ' '],
    ];

    for (const [pattern, replacement] of replacements) {
      plainText = plainText.replace(pattern, replacement);
    }
    
    return plainText?.trim() || '';
  }

  /**
   * Clean and normalize LaTeX output
   */
  private cleanLatex(latex: string): string {
    if (!latex) return '';

    // Remove common artifacts and normalize
    let cleaned = latex
      .replace(/^\$+|\$+$/g, '') // Remove wrapping dollar signs
      .replace(/\\text\{([^}]+)\}/g, '$1') // Unwrap \text{}
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return cleaned;
  }

  /**
   * Generate hash for image data caching
   */
  private async generateImageHash(imageData: ImageData): Promise<string> {
    // Simple hash based on image dimensions and some pixel data
    const { width, height, data } = imageData;
    const sampleSize = Math.min(100, data.length);
    let hash = `${width}x${height}`;

    for (let i = 0; i < sampleSize; i += 4) {
      hash += (data[i] || 0).toString(16);
    }

    return hash;
  }

  /**
   * Cache OCR result
   */
  private cacheResult(key: string, result: OCRResult): void {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  /**
   * Clear OCR cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ OCR cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// ===================================================================
// Singleton Instance
// ===================================================================

// Export singleton instance
export const mathOCRService = new MathOCRService();

// ===================================================================
// Utility Functions
// ===================================================================

/**
 * Extract image data from a canvas region
 */
export function extractImageFromCanvas(
  canvas: HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  scaleFactor: number = 1
): ImageData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    const x = Math.max(0, Math.floor(bbox.x * scaleFactor));
    const y = Math.max(0, Math.floor(bbox.y * scaleFactor));
    const width = Math.min(canvas.width - x, Math.floor(bbox.width * scaleFactor));
    const height = Math.min(canvas.height - y, Math.floor(bbox.height * scaleFactor));

    if (width <= 0 || height <= 0) return null;

    return ctx.getImageData(x, y, width, height);
  } catch (error) {
    console.error('Failed to extract image data:', error);
    return null;
  }
}

/**
 * Convert ImageData to data URL for debugging
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
