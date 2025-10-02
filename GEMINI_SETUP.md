# Google Gemini Setup Guide

## 🔑 Getting Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy your API key

## ⚙️ Configuration

1. Open the `.env` file in the project root
2. Replace `your_gemini_api_key_here` with your actual API key:

   ```
   VITE_GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

3. (Optional) Choose your model:

   ```
   # Fast & efficient (default) - Gemini 2.0 Flash
   VITE_GEMINI_MODEL=gemini-2.0-flash-exp

   # More powerful for complex questions - Gemini 2.0 Pro
   VITE_GEMINI_MODEL=gemini-2.0-pro-exp
   ```

## 🚀 Running the App

```bash
# Start the development server
npm run dev

# In another terminal, start Electron
npm run electron:dev
```

## 🎯 How It Works

Your AI-native PDF reader now uses Google Gemini:

1. **Open a PDF** in the app
2. **Highlight text** you want to ask about
3. **Ask a question** - the AI will answer inline (not in a sidebar!)
4. The answer appears **right next to your highlighted text**

## 📊 Model Comparison

| Model                | Speed         | Capability | Best For                                    |
| -------------------- | ------------- | ---------- | ------------------------------------------- |
| **Gemini 2.0 Flash** | ⚡️ Very Fast | Excellent  | Quick questions, summaries, multimodal      |
| **Gemini 2.0 Pro**   | 🐢 Slower     | Superior   | Complex analysis, deep questions, reasoning |

**Recommendation:** Start with Flash (default). Gemini 2.0 Flash is significantly improved over 1.5 and handles most tasks excellently. Switch to Pro only for highly complex reasoning tasks.

### 🆕 What's New in Gemini 2.0

- **Multimodal understanding**: Better integration with images and PDFs
- **Improved reasoning**: More accurate answers and better context understanding
- **Faster responses**: Gemini 2.0 Flash is both faster and more capable than 1.5 Flash
- **Enhanced document analysis**: Better at understanding complex document structures

## 🔒 Security

- ✅ Your `.env` file is in `.gitignore` - API keys won't be committed
- ✅ API keys stay local - never shared
- ⚠️ **DO NOT** commit your `.env` file to version control

## 🐛 Troubleshooting

### "No API key found" error

- Check that your `.env` file exists in the project root
- Verify `VITE_GEMINI_API_KEY=` has your actual key (no quotes needed)
- Restart the dev server after editing `.env`

### "Invalid API key" error

- Double-check your API key from Google AI Studio
- Make sure there are no extra spaces or characters
- Verify your API key is active and not expired

### "Rate limit exceeded" error

- You've made too many requests
- Gemini has generous free tier limits
- Wait a minute and try again
- Consider upgrading your API plan if this happens frequently

## 💡 Tips

1. **Flash is usually enough**: The 1.5 Flash model is fast and handles most questions well
2. **Keep context focused**: Highlight the specific text relevant to your question
3. **Clear answers**: Click outside the answer bubble to dismiss it
4. **API costs**: Gemini has a generous free tier - you likely won't hit limits during development

## 📚 Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing & Rate Limits](https://ai.google.dev/pricing)
- [Gemini 1.5 Features](https://deepmind.google/technologies/gemini/)

## 🎨 Project Philosophy Reminder

This is an **AI-native reader** where AI lives **INSIDE** the document:

- ❌ No sidebar chat
- ❌ No separate chat history view
- ✅ Inline answers next to highlights
- ✅ Context-aware, zero-friction experience

Stay focused on the MVP: **Highlight → Ask → Inline Answer**
