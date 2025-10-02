// ===================================================================
// Mathematical Content Detection for OCR-Enhanced Selection
// ===================================================================


// ===================================================================
// Type Definitions
// ===================================================================

export interface MathRegion {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  type: 'equation' | 'symbol' | 'formula' | 'expression';
  elements: HTMLElement[]; // DOM elements that contain the math
}

export interface MathDetectionResult {
  isMathContent: boolean;
  mathRegion: MathRegion | null;
  expandedSelection: Selection | null;
  textContent: string;
}

// ===================================================================
// Mathematical Character Patterns
// ===================================================================

// Unicode ranges for mathematical symbols
const MATH_UNICODE_RANGES = [
  [0x2200, 0x22FF], // Mathematical Operators
  [0x2300, 0x23FF], // Miscellaneous Technical
  [0x27C0, 0x27EF], // Miscellaneous Mathematical Symbols-A
  [0x2980, 0x29FF], // Miscellaneous Mathematical Symbols-B
  [0x2A00, 0x2AFF], // Supplemental Mathematical Operators
  [0x1D400, 0x1D7FF], // Mathematical Alphanumeric Symbols
];

// Common mathematical symbols and operators
const MATH_SYMBOLS = new Set([
  // Basic operators
  '=', '≠', '≈', '≡', '∝', '∞', '±', '∓', '×', '÷', '∘', '•',
  // Calculus
  '∂', '∇', '∆', '∫', '∮', '∑', '∏', '∐',
  // Set theory
  '∈', '∉', '∋', '∌', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅',
  // Logic
  '∧', '∨', '¬', '→', '←', '↔', '⇒', '⇐', '⇔', '∀', '∃',
  // Geometry
  '°', '∠', '⊥', '∥', '≅', '∼', '√', '∛', '∜',
  // Greek letters (common in math)
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
  'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'
]);

// Mathematical patterns (regex)
const MATH_PATTERNS = [
  /[a-zA-Z]\s*[\^_]\s*[\{\(\[]?[0-9a-zA-Z]+[\}\)\]]?/, // Superscripts/subscripts: x^2, a_i
  /\d+\s*[\+\-\*\/]\s*\d+/, // Basic arithmetic: 2+3, 5*7
  /[a-zA-Z]+\s*\([a-zA-Z0-9,\s]+\)/, // Functions: sin(x), f(a,b)
  /\b(?:sin|cos|tan|log|ln|exp|sqrt|abs|min|max)\b/, // Mathematical functions
  /\d+\s*=\s*\d+/, // Simple equations: 5 = 5
  /[a-zA-Z]\s*=\s*[a-zA-Z0-9\+\-\*\/\^\(\)]+/, // Variable equations: x = 2+3
  /\([^)]*[\+\-\*\/\^][^)]*\)/, // Parenthetical expressions
  /\[[^\]]*[\+\-\*\/\^][^\]]*\]/, // Bracketed expressions
  /\{[^}]*[\+\-\*\/\^][^}]*\}/, // Braced expressions
];

// ===================================================================
// Math Detection Functions
// ===================================================================

/**
 * Check if a character is mathematical
 */
function isMathCharacter(char: string): boolean {
  if (MATH_SYMBOLS.has(char)) return true;

  const codePoint = char.codePointAt(0);
  if (!codePoint) return false;

  return MATH_UNICODE_RANGES.some(([start, end]) =>
    codePoint >= start && codePoint <= end
  );
}

/**
 * Calculate math confidence score for text content
 */
function calculateMathConfidence(text: string): number {
  if (!text || text.length === 0) return 0;

  let score = 0;
  const totalChars = text.length;
  let mathChars = 0;
  let patternMatches = 0;

  // Count mathematical characters
  for (const char of text) {
    if (isMathCharacter(char)) {
      mathChars++;
    }
  }

  // Count pattern matches
  for (const pattern of MATH_PATTERNS) {
    if (pattern.test(text)) {
      patternMatches++;
    }
  }

  // Calculate base score from character ratio
  const charRatio = mathChars / totalChars;
  score += charRatio * 0.4; // 40% weight for math characters

  // Add pattern bonus
  score += Math.min(patternMatches * 0.2, 0.6); // Up to 60% for patterns

  // Bonus for specific mathematical constructs
  if (/[∫∑∏]/.test(text)) score += 0.3; // Integral, sum, product symbols
  if (/[αβγδεζηθικλμνξπρστυφχψω]/.test(text)) score += 0.2; // Greek letters
  if (/[a-zA-Z][\^_]/.test(text)) score += 0.2; // Superscripts/subscripts
  if (/\b(?:equation|formula|theorem|proof)\b/i.test(text)) score += 0.1; // Context keywords

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Get bounding rectangle that encompasses all elements
 */
function getCombinedBoundingRect(elements: HTMLElement[]): DOMRect {
  if (elements.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }

  if (elements.length === 1) {
    return elements[0].getBoundingClientRect();
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  });

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
}

/**
 * Expand selection to include complete mathematical expressions
 */
function expandSelectionToMathBoundaries(selection: Selection): Selection {
  if (!selection.rangeCount) return selection;

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;

  // Get all text nodes in the vicinity
  const walker = document.createTreeWalker(
    commonAncestor.nodeType === Node.TEXT_NODE
      ? commonAncestor.parentElement || commonAncestor
      : commonAncestor,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Text | null = null;

  while (node = walker.nextNode() as Text) {
    textNodes.push(node);
  }

  // Find the range of text nodes that contain mathematical content
  const startNodeIndex = textNodes.findIndex(n => range.intersectsNode(n));
  // Use reverse loop since findLastIndex might not be available
  let endNodeIndex = -1;
  for (let i = textNodes.length - 1; i >= 0; i--) {
    if (range.intersectsNode(textNodes[i])) {
      endNodeIndex = i;
      break;
    }
  }

  if (startNodeIndex === -1 || endNodeIndex === -1) return selection;

  // Try to expand to include complete mathematical expressions
  let expandedStart = startNodeIndex;
  let expandedEnd = endNodeIndex;

  // Expand backwards
  for (let i = startNodeIndex - 1; i >= 0; i--) {
    const node = textNodes[i];
    if (!node) break;
    const text = node.textContent || '';
    if (calculateMathConfidence(text) > 0.3) {
      expandedStart = i;
    } else {
      break;
    }
  }
  
  // Expand forwards
  for (let i = endNodeIndex + 1; i < textNodes.length; i++) {
    const node = textNodes[i];
    if (!node) break;
    const text = node.textContent || '';
    if (calculateMathConfidence(text) > 0.3) {
      expandedEnd = i;
    } else {
      break;
    }
  }

  // Create new selection with expanded range
  const newRange = document.createRange();
  
  const startNode = textNodes[expandedStart];
  const endNode = textNodes[expandedEnd];
  
  if (startNode && endNode && expandedStart < textNodes.length && expandedEnd < textNodes.length) {
    newRange.setStart(startNode, 0);
    newRange.setEnd(endNode, endNode.textContent?.length || 0);
    
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  return selection;
}

// ===================================================================
// Main Detection Function
// ===================================================================

/**
 * Analyze a text selection for mathematical content
 *
 * @param selection - The current text selection
 * @returns Detection result with math region and confidence
 */
export function detectMathInSelection(selection: Selection): MathDetectionResult {
  const result: MathDetectionResult = {
    isMathContent: false,
    mathRegion: null,
    expandedSelection: null,
    textContent: '',
  };

  // Check if we have a valid selection
  if (!selection || !selection.rangeCount || selection.isCollapsed) {
    return result;
  }

  // Get text content
  const textContent = selection.toString().trim();
  result.textContent = textContent;

  if (!textContent) return result;

  // Calculate mathematical confidence
  const confidence = calculateMathConfidence(textContent);

  // Threshold for considering content as mathematical
  if (confidence >= 0.3) {
    result.isMathContent = true;

    // Try to expand selection to include complete math expressions
    result.expandedSelection = expandSelectionToMathBoundaries(selection);

    // Get all elements in the selection
    const range = result.expandedSelection.getRangeAt(0);
    const elements: HTMLElement[] = [];

    // Collect all span elements in the selection (PDF text spans)
    const walker = document.createTreeWalker(
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement || range.commonAncestorContainer
        : range.commonAncestorContainer,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Element) => {
          if (node.tagName === 'SPAN' && range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let element: Element | null;
    while (element = walker.nextNode() as Element) {
      elements.push(element as HTMLElement);
    }

    // Get bounding rectangle
    const bbox = getCombinedBoundingRect(elements);

    // Determine math type based on content
    let type: MathRegion['type'] = 'expression';
    if (/[∫∑∏]/.test(textContent)) type = 'equation';
    else if (textContent.length < 5 && /[αβγδεπλμσΣΠ∞±≠≈]/.test(textContent)) type = 'symbol';
    else if (/=/.test(textContent)) type = 'equation';
    else if (/[a-zA-Z]+\([^)]+\)/.test(textContent)) type = 'formula';

    result.mathRegion = {
      bbox: {
        x: bbox.left,
        y: bbox.top,
        width: bbox.width,
        height: bbox.height,
      },
      confidence,
      type,
      elements,
    };
  }

  return result;
}

/**
 * Detect mathematical content in a single click position
 * Used for the "snap-to-equation" flow
 */
export function detectMathAtPoint(x: number, y: number): MathDetectionResult {
  const element = document.elementFromPoint(x, y);
  if (!element) {
    return {
      isMathContent: false,
      mathRegion: null,
      expandedSelection: null,
      textContent: '',
    };
  }

  // Get text content from the element
  const textContent = element.textContent || '';
  const confidence = calculateMathConfidence(textContent);

  if (confidence >= 0.4) { // Higher threshold for single click
    // Create a selection around this element
    const range = document.createRange();
    range.selectNodeContents(element);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);

      return detectMathInSelection(selection);
    }
  }

  return {
    isMathContent: false,
    mathRegion: null,
    expandedSelection: null,
    textContent,
  };
}

/**
 * Pre-process visible PDF pages to identify mathematical content
 * This can be used for background processing and caching
 */
export function preProcessMathContent(pageElement: HTMLElement): MathRegion[] {
  const mathRegions: MathRegion[] = [];

  // Find all text spans in the page
  const spans = pageElement.querySelectorAll('.textLayer span');

  spans.forEach(span => {
    const text = span.textContent || '';
    const confidence = calculateMathConfidence(text);

    if (confidence >= 0.5) { // High threshold for background detection
      const rect = span.getBoundingClientRect();

      let type: MathRegion['type'] = 'expression';
      if (/[∫∑∏]/.test(text)) type = 'equation';
      else if (text.length < 3 && isMathCharacter(text)) type = 'symbol';
      else if (/=/.test(text)) type = 'equation';
      else if (/[a-zA-Z]+\([^)]+\)/.test(text)) type = 'formula';

      mathRegions.push({
        bbox: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        confidence,
        type,
        elements: [span as HTMLElement],
      });
    }
  });

  return mathRegions;
}
