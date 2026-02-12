import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting per user
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const MAX_REQUESTS = 20;

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
  if (input.length > 10 * 1024 * 1024 * 1.37) return null;
  return input;
}

const languageInstructions: Record<string, string> = {
  english: 'Respond in English.',
  cantonese: 'Respond in Traditional Chinese using Cantonese expressions (粵語).',
  chinese_traditional: 'Respond in Traditional Chinese (繁體中文).',
  chinese_simplified: 'Respond in Simplified Chinese (简体中文).'
};

const personaInstructions: Record<string, string> = {
  professional: 'You are a general B2B sales professional. Use balanced professionalism and consultative approach.',
  enterprise: 'You are an enterprise sales specialist. Emphasize ROI, scalability, and stakeholder management.',
  smb: 'You are an SMB/Startup sales specialist. Focus on quick wins and cost-effectiveness.',
  support: 'You are a customer support representative. Prioritize empathy and problem-solving.',
  luxury: 'You are a luxury sales consultant. Emphasize exclusivity and personalized service.'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate inputs
    const message = sanitizeString(body.message, 5000);
    const image = body.image ? validateBase64Image(body.image) : null;
    const tone = sanitizeString(body.tone || 'professional', 50);
    const language = sanitizeString(body.language || 'english', 30);
    const persona = sanitizeString(body.persona || 'professional', 50);
    const customPersonaInstructions = body.customPersonaInstructions ? sanitizeString(body.customPersonaInstructions, 1000) : null;
    const latestInfo = body.latestInfo ? sanitizeString(body.latestInfo, 2000) : null;
    const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory.slice(0, 50) : null;

    if (!message && !image) {
      return new Response(JSON.stringify({ error: 'Message or image is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const authHeader = req.headers.get('authorization') || '';
    const userId = authHeader.slice(-16) || 'anonymous';
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    const roleContext = customPersonaInstructions 
      ? `YOUR ROLE: ${customPersonaInstructions}` 
      : personaInstructions[persona] || personaInstructions.professional;

    const latestInfoContext = latestInfo 
      ? `\n\nLATEST INFORMATION & POLICIES:\n${latestInfo}\n\nIncorporate this information naturally into replies when relevant.`
      : '';

    const hasConversation = !!conversationHistory;

    const systemPrompt = `You are an elite sales communication specialist.

${languageInstructions[language] || languageInstructions.english}

${roleContext}
${latestInfoContext}

WHATSAPP SCREENSHOT RULES:
- LEFT SIDE messages = CLIENT messages (analyze these)
- RIGHT SIDE messages = YOUR messages (already sent)
Write replies FROM YOUR perspective responding to the client.

${hasConversation ? `CONVERSATION CONTEXT: Analyze relationship progression, track commitments, identify patterns.` : ''}

ANALYSIS REQUIREMENTS:
1. Sentiment: positive, neutral, negative, urgent, or opportunity
2. Key Points: needs, objections, timeline, budget signals
3. Generate 3 replies:
   - Professional: consultative, data-driven
   - Friendly: warm, relationship-focused  
   - Confident: direct, solution-oriented

REPLY GUIDELINES:
- Keep responses concise (2-4 sentences for WhatsApp)
- Include a clear call-to-action
- Address specific points raised
${latestInfo ? '- Reference current promotions when relevant' : ''}
${hasConversation ? '- Reference conversation history naturally' : ''}

${hasConversation ? `Also generate 3-5 follow-up suggestions and conversation insights.` : ''}

Return JSON:
{
  "sentiment": "positive|neutral|negative|urgent|opportunity",
  "keyPoints": ["point 1", "point 2"],
  "suggestedReplies": {
    "professional": "reply",
    "friendly": "reply",
    "confident": "reply"
  }${hasConversation ? `,
  "followUpSuggestions": ["action 1", "action 2"],
  "conversationInsights": "brief analysis"` : ''}
}`;

    let userContent;
    if (image) {
      const contextInfo = hasConversation 
        ? `Conversation history: ${JSON.stringify(conversationHistory)}. Context: ${message || 'Analyze screenshot'}`
        : message || 'Analyze WhatsApp screenshot - LEFT=client, RIGHT=me. Help me reply.';
      
      userContent = [
        { type: "text", text: `Analyze this WhatsApp screenshot. LEFT=CLIENT, RIGHT=ME. ${contextInfo}` },
        { type: "image_url", image_url: { url: image } }
      ];
    } else {
      const conversationContext = hasConversation 
        ? `Conversation:\n${conversationHistory!.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n')}\n\nLatest: "${message}"`
        : `Analyze this client message: "${message}"`;
      
      userContent = conversationContext;
    }

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
    console.error('Error in analyze-message:', error);
    return new Response(JSON.stringify({ error: 'Analysis failed. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
