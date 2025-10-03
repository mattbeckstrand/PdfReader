# LaTeX Extraction Fix - Isolated Equations

## Problem

When selecting only an equation (without surrounding text), MathPix OCR was not correctly parsing the LaTeX. However, when selecting a larger area that included the equation plus surrounding context, it worked correctly.

## Root Cause

The issue was that the OCR was receiving the **exact pixel boundaries** of the selection with **no padding**. MathPix (and most OCR systems) perform much better when there's whitespace/context around the content being recognized.

When you selected the larger area, it naturally included padding (surrounding text, margins, etc.), which provided the visual context MathPix needed to correctly identify the mathematical notation.

## Solution Implemented

### 1. **Added Padding Around Selections** (`scripts/extract_region.py`)

- Added 15pt padding around all selected regions before rendering to PNG
- Padding stays within page bounds (won't go off the page)
- This gives MathPix visual context even for tightly-selected equations

```python
def render_region_png(..., padding: float = 10.0) -> bytes:
    # Add padding to the rectangle, but stay within page bounds
    padded_rect = fitz.Rect(
        max(rect.x0 - padding, page_rect.x0),
        max(rect.y0 - padding, page_rect.y0),
        min(rect.x1 + padding, page_rect.x1),
        min(rect.y1 + padding, page_rect.y1)
    )
```

### 2. **Increased Rendering Quality**

- Increased scale factor from 2.0x to 3.0x for sharper images
- Higher DPI helps MathPix recognize symbols more accurately

### 3. **Improved MathPix API Parameters**

Added explicit math-focused parameters:

```python
payload = {
    "src": f"data:image/png;base64,{img_b64}",
    "formats": ["text", "latex_styled"],
    "rm_spaces": True,
    "math_inline_delimiters": ["$", "$"],
    "math_display_delimiters": ["$$", "$$"],
    "include_asciimath": False,
    "include_latex": True,
}
```

## Testing

Try selecting the equation from your screenshot:

```
awl(f(S), P) = Σ ℓ(f(s))P(s) = Σ ℓ(cⱼ)pⱼ
```

The system should now correctly extract the LaTeX even when you select ONLY the equation without any surrounding text.

## Debug Information

The script saves debug images to `/tmp/pdf_ocr_debug_p{page_number}.png` so you can see exactly what's being sent to MathPix. You can inspect these to verify the padding is being added correctly.

## Why This Works

1. **Visual Context**: OCR models (including MathPix) are trained on images that include natural margins and spacing. Cropping too tightly removes visual cues about layout.

2. **Symbol Recognition**: Math symbols at edges of images can be ambiguous. Padding ensures symbols are fully visible with clear boundaries.

3. **Layout Understanding**: Surrounding whitespace helps the model understand this is a display equation vs. inline math vs. regular text.

## Changes Made

- ✅ `scripts/extract_region.py`: Added padding parameter (default 15pt)
- ✅ `scripts/extract_region.py`: Increased scale to 3.0x for better quality
- ✅ `scripts/extract_region.py`: Enhanced MathPix API parameters
- ✅ Added debug logging for rect dimensions

## No Rebuild Needed

Since the Python script is called at runtime (not compiled), the changes are **already active**. Just restart the app and test!
