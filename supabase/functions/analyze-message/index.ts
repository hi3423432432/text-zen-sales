import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, image, tone = 'professional', language = 'english', persona = 'professional', customPersonaInstructions, conversationHistory } = await req.json();
    console.log('Analyzing message:', message, 'has image:', !!image, 'with tone:', tone, 'language:', language, 'persona:', persona, 'custom instructions:', !!customPersonaInstructions, 'has conversation:', !!conversationHistory);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const languageInstructions = {
      english: 'Respond in English.',
      cantonese: 'Respond in Traditional Chinese using Cantonese expressions and colloquialisms (粵語).',
      chinese_traditional: 'Respond in Traditional Chinese (繁體中文).',
      chinese_simplified: 'Respond in Simplified Chinese (简体中文).'
    };

    const personaInstructions = {
      professional: 'General B2B sales approach with balanced professionalism.',
      enterprise: 'Enterprise sales focus: emphasize ROI, scalability, compliance, long-term value, and stakeholder management. Use formal language and demonstrate deep industry expertise.',
      smb: 'SMB/Startup approach: focus on quick wins, cost-effectiveness, ease of implementation, and growth potential. Be more casual and action-oriented.',
      support: 'Customer support mode: prioritize empathy, problem-solving, retention, and satisfaction. Address concerns proactively and build trust.',
      luxury: 'Luxury/Premium sales: emphasize exclusivity, prestige, personalized service, and superior quality. Use sophisticated language and create desire.'
    };

    const systemPrompt = `You are an elite sales communication specialist with expertise in customer psychology and conversion optimization. 

${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.english}

PERSONA CONTEXT: ${customPersonaInstructions || personaInstructions[persona as keyof typeof personaInstructions] || personaInstructions.professional}

${conversationHistory ? `
CONVERSATION CONTEXT ANALYSIS:
You have access to the full conversation thread. Analyze:
1. Relationship progression and rapport level
2. Previously discussed topics and commitments
3. Client's evolving needs and objections
4. Response patterns and engagement level
5. Best timing and approach for follow-up

Use this context to:
- Reference previous discussion points naturally
- Track promise/commitment fulfillment
- Identify patterns in client behavior
- Suggest strategic follow-up timing
- Personalize based on conversation history
` : ''}

ANALYSIS REQUIREMENTS:
1. Sentiment Detection: Classify as positive, neutral, negative, urgent, or opportunity
   - Detect buying signals, objections, budget concerns, timeline pressure
   - Identify pain points and motivations
   
2. Key Points Extraction: 
   - What the client wants/needs
   - Any objections or concerns raised
   - Timeline or urgency indicators
   - Budget signals or price sensitivity
   - Decision-making stage

3. Generate 3 strategic replies optimized for conversion:
   
   PROFESSIONAL TONE:
   - Consultative and authoritative
   - Address concerns with data/social proof
   - Clear next steps and CTAs
   - Position as trusted advisor
   
   FRIENDLY TONE:
   - Warm, empathetic, relationship-focused
   - Use casual language while maintaining credibility
   - Build rapport and trust
   - Show understanding of their situation
   
   CONFIDENT TONE:
   - Direct and solution-oriented
   - Demonstrate expertise and value proposition
   - Handle objections proactively
   - Create urgency with benefits/scarcity

REPLY GUIDELINES:
- Keep responses concise (2-4 sentences max for WhatsApp)
- Include a clear call-to-action
- Mirror client's language style
- Address specific points they raised
- Use emojis sparingly and appropriately
- Provide value in every message
${conversationHistory ? '- Reference conversation history naturally when relevant' : ''}

${conversationHistory ? `
FOLLOW-UP STRATEGY:
Generate 3-5 actionable follow-up suggestions based on:
- Client's responsiveness pattern
- Current stage in sales cycle
- Objections or hesitations shown
- Engagement level and interest signals
- Best next steps to move forward

CONVERSATION INSIGHTS:
Provide a brief analysis (2-3 sentences) of:
- Overall conversation health and momentum
- Client's buying readiness
- Key concerns to address
- Relationship status
` : ''}

Return JSON:
{
  "sentiment": "positive|neutral|negative|urgent|opportunity",
  "keyPoints": ["detailed point 1", "detailed point 2", "..."],
  "suggestedReplies": {
    "professional": "strategic professional reply",
    "friendly": "warm engaging reply",
    "confident": "assertive value-driven reply"
  }${conversationHistory ? `,
  "followUpSuggestions": ["specific follow-up action 1", "specific follow-up action 2", "..."],
  "conversationInsights": "brief analysis of conversation health and next steps"` : ''}
 }`;

    let userContent;
    if (image) {
      // If image is provided, use vision capability to extract text from image
      const contextInfo = conversationHistory 
        ? `Conversation history: ${JSON.stringify(conversationHistory)}. Current message/image context: ${message || 'Analyze screenshot'}`
        : message || 'Analyze screenshot';
      
      userContent = [
        { 
          type: "text", 
          text: `Extract and analyze text from the image. ${contextInfo}` 
        },
        { 
          type: "image_url", 
          image_url: { url: image } 
        }
      ];
    } else {
      const conversationContext = conversationHistory 
        ? `Conversation history:\n${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\nLatest client message: "${message}"`
        : `Analyze this client message and suggest replies: "${message}"`;
      
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
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    // Extract the content and strip markdown code blocks if present
    let content = data.choices[0].message.content;
    
    // Remove markdown code block markers (```json and ```)
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    
    const aiResponse = JSON.parse(content);

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-message function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
