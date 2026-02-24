/**
 * Caffeine Machine – Cloudflare Pages Function
 * File: functions/api/chat.js
 *
 * Environment Variable Required:
 *   GEMINI_API_KEY  — your Google Gemini API key
 *
 * Endpoint: POST /api/chat
 * Body: { message: string, history: Array, systemPrompt: string }
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    // ── CORS headers ─────────────────────────────────────────────────────────────
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // ── Parse request ─────────────────────────────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders });
    }

    const { message, history = [], systemPrompt = '' } = body;

    if (!message || typeof message !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing or invalid "message" field' }), { status: 400, headers: corsHeaders });
    }

    // ── API key ───────────────────────────────────────────────────────────────────
    const apiKey = env.API_KEY_caffine;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error: missing API key (API_KEY_caffine)' }), { status: 500, headers: corsHeaders });
    }

    // ── Build conversation contents ───────────────────────────────────────────────
    const contents = [];

    // Inject system prompt as a user/model exchange at the start
    if (systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood! I\'m ready to assist as the Caffeine Machine AI barista. ☕' }] });
    }

    // Add history (last 10 turns)
    if (Array.isArray(history)) {
        const trimmedHistory = history.slice(-10);
        for (const turn of trimmedHistory) {
            if (turn.role && Array.isArray(turn.parts)) {
                contents.push({ role: turn.role, parts: turn.parts });
            }
        }
    }

    // Add current user message
    contents.push({ role: 'user', parts: [{ text: message }] });

    // ── Call Gemini API ───────────────────────────────────────────────────────────
    const GEMINI_MODEL = 'gemma-3-27b-it';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    let geminiResponse;
    try {
        geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 512,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            }),
        });
    } catch (fetchErr) {
        return new Response(JSON.stringify({ error: 'Failed to reach Gemini API', details: fetchErr.message }), { status: 502, headers: corsHeaders });
    }

    // ── Handle Gemini errors ──────────────────────────────────────────────────────
    if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch { errJson = { raw: errText }; }
        return new Response(JSON.stringify({ error: 'Gemini API error', status: geminiResponse.status, details: errJson }), { status: geminiResponse.status, headers: corsHeaders });
    }

    // ── Extract reply ─────────────────────────────────────────────────────────────
    let geminiData;
    try {
        geminiData = await geminiResponse.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Failed to parse Gemini response' }), { status: 502, headers: corsHeaders });
    }

    const candidate = geminiData?.candidates?.[0];
    const reply = candidate?.content?.parts?.[0]?.text;

    if (!reply) {
        const finishReason = candidate?.finishReason || 'UNKNOWN';
        return new Response(JSON.stringify({ error: 'No reply from Gemini', finishReason }), { status: 502, headers: corsHeaders });
    }

    // ── Return response ───────────────────────────────────────────────────────────
    return new Response(JSON.stringify({ reply }), { status: 200, headers: corsHeaders });
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
