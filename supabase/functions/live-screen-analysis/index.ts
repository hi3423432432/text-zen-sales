import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting per user
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_REQUESTS = 15; // max 15 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(userId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  requestTimestamps.set(userId, recent);
  return true;
}

// Input sanitization
function sanitizeString(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>]/g, '');
}

function validateBase64Image(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  if (!input.startsWith('data:image/')) return null;
  // Limit to ~10MB base64
  if (input.length > 10 * 1024 * 1024 * 1.37) return null;
  return input;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate and sanitize inputs
    const screenshot = validateBase64Image(body.screenshot);
    if (!screenshot) {
      return new Response(JSON.stringify({ error: 'Invalid or missing screenshot' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const customInstructions = sanitizeString(body.customInstructions, 1000);
    const latestInfo = sanitizeString(body.latestInfo, 2000);
    const manualInstruction = sanitizeString(body.manualInstruction, 500);
    
    // Extract user ID from auth header for rate limiting
    const authHeader = req.headers.get('authorization') || '';
    const userId = authHeader.slice(-16) || 'anonymous';
    
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Live screen analysis - has manual instruction:', !!manualInstruction);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    const roleContext = customInstructions 
      ? `YOUR ROLE: ${customInstructions}` 
      : 'You are an expert sales communication specialist with deep understanding of customer psychology.';

    const latestInfoContext = latestInfo 
      ? `\n\nLATEST INFORMATION & POLICIES:\n${latestInfo}\n\nUse this information when crafting responses.`
      : '';

    const manualInstructionContext = manualInstruction
      ? `\n\nUSER'S MANUAL INSTRUCTION (HIGHEST PRIORITY):\n${manualInstruction}\n\nYou MUST follow this instruction when generating the reply.`
      : '';

    const systemPrompt = `You are a real-time AI sales assistant watching a user's screen as they chat with clients on WhatsApp or other messaging apps.

${roleContext}
${latestInfoContext}
${manualInstructionContext}

CRITICAL - MESSAGE BUBBLE POSITION RULES (HIGHEST PRIORITY):
You are analyzing a screenshot of a messaging app (WhatsApp, WeChat, LINE, Telegram, etc.).
Follow these ABSOLUTE rules to identify who said what:

1. **LEFT-ALIGNED messages** (bubbles touching or near the LEFT edge) = **CLIENT** messages
   - These are typically white, light gray, or lighter-colored bubbles
   - They may include the client's profile picture/avatar on the left
   - ANY message on the left side is ALWAYS from the client, no exceptions

2. **RIGHT-ALIGNED messages** (bubbles touching or near the RIGHT edge) = **USER** messages  
   - These are typically green, blue, or darker/colored bubbles
   - They represent what the user has already sent
   - ANY message on the right side is ALWAYS from the user, no exceptions

3. **Reading order**: Read messages TOP to BOTTOM to understand the chronological flow
4. **Multiple messages**: A person may send multiple consecutive messages - group them together
5. **Media messages**: Images, voice messages, stickers on the left = client sent them; on the right = user sent them
6. **System messages**: Center-aligned messages (dates, "missed call", etc.) are system notifications

CONVERSATION ANALYSIS:

1. EXTRACT ALL MESSAGES by position (left=client, right=user)
2. DETECT: conversation state, stage, and client emotion
3. DEEP INTENT ANALYSIS: explicit asks, hidden needs, objections, buying signals
4. GENERATE 1-3 REPLY SUGGESTIONS: natural, conversational, with clear strategy

Return JSON:
{
  "needsResponse": true/false,
  "clientStatus": "client status description",
  "emotion": "积极|中性|犹豫|不满",
  "stage": "开场|探需|解疑|成交|售后",
  "lastClientMessage": "last client message content",
  "conversationFlow": [{"side": "client|user", "content": "message summary"}],
  "objections": ["objection descriptions"],
  "buyingSignals": ["buying signal descriptions"],
  "suggestions": [{"content": "suggested reply", "strategy": "why this reply + expected effect"}],
  "insights": "deep insights and next steps"
}`;

    const userContent = [
      { 
        type: "text", 
        text: manualInstruction 
          ? `Analyze this messaging screenshot and generate a reply based on: ${manualInstruction}`
          : "Analyze this messaging screenshot. Identify client messages (LEFT) and suggest optimal replies." 
      },
      { 
        type: "image_url", 
        image_url: { url: screenshot } 
      }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', response.status);
      throw new Error('Analysis service temporarily unavailable');
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    
    const aiResponse = JSON.parse(content);

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in live-screen-analysis:', error);
    // Sanitize error message - never expose internals
    return new Response(JSON.stringify({ error: 'Analysis failed. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
