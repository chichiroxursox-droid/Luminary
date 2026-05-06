import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env into process.env so API keys are available
const env = loadEnv('', __dirname, '');
Object.assign(process.env, env);

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: { outDir: 'dist' },
  plugins: [
    {
      name: 'no-cache-games',
      configureServer(server) {
        // Prevent browser from caching game files (pck, wasm, js)
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/games/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          }
          next();
        });
      },
    },
    {
      name: 'chat-api',
      configureServer(server) {
        // Read the system prompt once at server start
        const promptPath = path.resolve(__dirname, 'src/ethan-prompt.txt');
        let systemPrompt = '';
        try {
          systemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();
        } catch (err) {
          console.warn('Chat API: Could not read ethan-prompt.txt —', err.message);
          systemPrompt = 'You are Ethan, a friendly student and developer.';
        }

        server.middlewares.use('/api/chat', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          if (!process.env.GEMINI_API_KEY) {
            console.warn('Chat API: GEMINI_API_KEY is not set. Chat will not work.');
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Chat is not configured yet. Please set the GEMINI_API_KEY environment variable.',
            }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { message, history } = JSON.parse(body);

              if (!message || typeof message !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing or invalid "message" field.' }));
                return;
              }

              const { GoogleGenerativeAI } = await import('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
              const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: systemPrompt,
              });

              // Convert history to Gemini format
              const geminiHistory = [];
              if (Array.isArray(history)) {
                for (const m of history) {
                  geminiHistory.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                  });
                }
              }

              const chat = model.startChat({
                history: geminiHistory,
                generationConfig: {
                  maxOutputTokens: 2048,
                  temperature: 0.7,
                },
              });

              const result = await chat.sendMessage(message);
              const reply = result.response.text()
                || 'Sorry, I couldn\'t respond right now.';

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ response: reply }));
            } catch (err) {
              console.error('Chat API error:', err.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Chat service unavailable' }));
            }
          });
        });
      },
    },
  ],
});
