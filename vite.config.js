import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env into process.env so the Groq SDK can read GROQ_API_KEY
const env = loadEnv('', __dirname, '');
Object.assign(process.env, env);

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: { outDir: 'dist' },
  plugins: [
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

          // Check for API key before doing anything else
          if (!process.env.GROQ_API_KEY) {
            console.warn('Chat API: GROQ_API_KEY is not set. Chat will not work.');
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Chat is not configured yet. Please set the GROQ_API_KEY environment variable.',
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

              // Dynamic import so the module is only loaded when needed
              const { default: Groq } = await import('groq-sdk');
              const groq = new Groq();

              const messages = [
                { role: 'system', content: systemPrompt },
                ...(Array.isArray(history)
                  ? history.map((m) => ({ role: m.role, content: m.content }))
                  : []),
                { role: 'user', content: message },
              ];

              const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 200,
                temperature: 0.7,
              });

              const reply = completion.choices[0]?.message?.content
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
