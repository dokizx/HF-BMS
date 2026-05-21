ChatGPT SA Analyser setup

The BMS browser file now calls /api/analyze-service-agreement for ChatGPT analysis.
To enable it securely:

1. Deploy this folder to Vercel or another server that supports serverless functions.
2. Add environment variable OPENAI_API_KEY in the server/project settings.
3. Optional: add OPENAI_MODEL, otherwise it uses gpt-4.1-mini.
4. Do not place an OpenAI API key inside the HTML/browser code.

When the backend is not configured, the BMS automatically falls back to the local smart analyser.
