# OCR Setup Guide - Mathematical Equation Recognition

This guide walks you through setting up the OCR (Optical Character Recognition) system for mathematical equation recognition in your AI PDF Reader.

## 🎯 Overview

The OCR system automatically detects and processes mathematical equations, converting them into clean LaTeX format for better AI understanding. This dramatically improves AI responses for mathematical content.

## 📋 Features

- ✨ **Automatic Math Detection**: Recognizes equations using Unicode patterns and visual analysis
- 🔍 **Smart Selection**: Auto-expands selections to include complete equations
- 🎨 **Visual Feedback**: Purple highlights indicate when math content is detected
- ⚡ **Fast Processing**: Results cached to avoid reprocessing same equations
- 🤖 **AI Integration**: Clean LaTeX sent to AI for better mathematical understanding

## 🔧 Setup Options

### Option 1: Mathpix API (Recommended)

**Best accuracy for complex equations, rendered math, and handwritten formulas.**

1. **Get API Credentials**:

   - Sign up at [mathpix.com](https://mathpix.com/)
   - Go to your dashboard and create an API key
   - Copy your `App ID` and `App Key`

2. **Configure Environment Variables**:

   ```bash
   # Add to your .env file or environment
   MATHPIX_APP_ID=your_app_id_here
   MATHPIX_APP_KEY=your_app_key_here
   ```

3. **Test the Setup**:
   - Load a PDF with mathematical equations
   - Select/click on an equation
   - You should see "📐 Mathematical content" indicator
   - The recognized LaTeX will appear in the action menu

### Option 2: Fallback Mode (Default)

**Works without API keys, good for basic mathematical text.**

- No setup required
- Uses built-in text extraction and basic pattern matching
- Lower accuracy but handles simple mathematical expressions
- Automatically used if Mathpix credentials are not configured

## 🚀 Usage

### Drag-Select Equations

1. **Select Mathematical Content**: Drag across an equation like `∫₀^∞ e^(-x²) dx = √π/2`
2. **Auto-Enhancement**: Selection automatically expands to include the complete equation
3. **Visual Feedback**: Purple highlight indicates math mode is active
4. **OCR Processing**: Equation is converted to clean LaTeX in the background
5. **Action Menu**: Choose from math-specific actions:
   - 🤖 **Explain**: Get step-by-step explanation
   - 🧮 **Solve**: Solve the equation with steps
   - 📝 **Simplify**: Simplify the expression
   - ✏️ **Edit**: Correct OCR if needed

### Single-Click Snap-to-Equation

1. **Click Once**: Single-click on any part of an equation
2. **Auto-Selection**: Entire equation is automatically selected
3. **Instant Processing**: OCR begins immediately
4. **AI Ready**: Ask questions about the equation

## 🎨 Visual Indicators

| Indicator                           | Meaning                                |
| ----------------------------------- | -------------------------------------- |
| 📐 Mathematical content             | Math detected, OCR processing          |
| 📐 Mathematical content (95%)       | OCR completed with confidence score    |
| ⚠️ Edit (67%)                       | Low confidence OCR, review recommended |
| 🔄 Recognizing equation...          | OCR in progress                        |
| Purple highlight                    | Math mode active                       |
| RECOGNIZED AS: `\int_0^{\infty}...` | Clean LaTeX preview                    |

## 🛠️ Advanced Configuration

### Customizing Math Detection

Edit `src/lib/mathDetection.ts` to adjust:

- **Detection sensitivity** (confidence thresholds)
- **Mathematical symbols** recognized
- **Pattern matching** rules

### OCR Service Settings

Edit `src/lib/ocrService.ts` to configure:

- **Cache size** for processed equations
- **Timeout settings** for API calls
- **Fallback behavior** when OCR fails

## 🐛 Troubleshooting

### Common Issues

**"Could not find PDF canvas for OCR processing"**

- Ensure PDF is fully loaded before selecting equations
- Check browser console for PDF rendering errors

**OCR not working despite Mathpix credentials**

- Verify environment variables are loaded correctly
- Check network connection and API quota
- Look for API error messages in browser console

**Math detection not working**

- Check that equations contain recognizable mathematical symbols
- Try selecting a larger region around the equation
- Verify Unicode support in the PDF

**Low OCR confidence warnings**

- Use the "Edit" button to correct recognized equations
- Try selecting a cleaner region around the equation
- Check if the PDF image quality is sufficient

### Debug Mode

Enable detailed logging by opening browser console:

```javascript
// See math detection results
console.log('Math detection:', window.mathDetection);

// View OCR service stats
console.log('OCR cache:', window.mathOCRService?.getCacheStats());
```

## 📊 Performance

### What's Cached

- ✅ OCR results (per equation)
- ✅ Math detection patterns
- ✅ Character position maps

### What's NOT Cached

- ❌ PDF canvas data (memory intensive)
- ❌ API authentication tokens
- ❌ User corrections (cleared on reload)

### Optimization Tips

- OCR requests are debounced to prevent API spam
- Background processing for visible equations
- Canvas coordinate caching for faster image extraction

## 🔐 Privacy & Security

- **API Calls**: Only equation images are sent to Mathpix, never full PDF content
- **Local Processing**: Math detection happens locally in your browser
- **No Storage**: OCR results are cached in memory only, not persisted
- **User Control**: All OCR can be disabled by not providing API credentials

## 🆘 Getting Help

### Check These First

1. Browser console for error messages
2. Network tab for API call failures
3. PDF console logs for canvas issues

### Report Issues

Include this information:

- Browser version and OS
- PDF that's causing issues
- Console error messages
- Steps to reproduce the problem

---

## 🎉 Ready to Use!

Your OCR system is now set up! Try selecting mathematical equations in your PDFs and watch as they're automatically recognized and processed for better AI understanding.

The system works seamlessly in the background - users will just experience better, more accurate responses when asking about mathematical content.
