/**
 * Caffeine Machine - Cloudflare Worker
 * -----------------------------------
 * This worker handles AI chat interactions using Google Gemini.
 * 
 * Config:
 * - Model: gemma-3-27b-it
 * - API Key Secret Expected: API_KEY_caffine
 */

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const { message, history = [], systemPrompt = "" } = await request.json();

            const API_KEY = env.API_KEY_caffine;
            const MODEL = "gemma-3-27b-it";

            if (!API_KEY) {
                return new Response(JSON.stringify({ error: "API key not configured" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }

            // Build Gemini Payload
            const contents = [];

            // Defined human-like persona
            const BARISTA_PROMPT = `You are a friendly barista at Caffeine Machine in Las Vegas. 
            Talk like a real person—simple, warm, and natural. Keep it short (1-2 sentences). 
            Mention the "Coffee Flight" if they're looking for recommendations! ☕`;

            contents.push({ role: 'user', parts: [{ text: BARISTA_PROMPT }] });
            contents.push({ role: 'model', parts: [{ text: "Got it! I'll keep it simple and friendly, like a real chat. ☕" }] });

            // Add conversation history
            history.slice(-10).forEach(turn => {
                if (turn.role && turn.parts) {
                    contents.push({ role: turn.role, parts: turn.parts });
                }
            });

            // Add new message
            contents.push({ role: 'user', parts: [{ text: message }] });

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 512,
                    }
                }),
            });

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            return new Response(JSON.stringify({ reply: reply || "I'm sorry, I couldn't brew a response right now. ☕" }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
    },
};
