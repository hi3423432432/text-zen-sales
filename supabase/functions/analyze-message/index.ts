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
    const { message, image, tone = 'professional' } = await req.json();
    console.log('Analyzing message:', message, 'has image:', !!image, 'with tone:', tone);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an elite sales communication specialist with expertise in customer psychology and conversion optimization. 

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

Return JSON:
{
  "sentiment": "positive|neutral|negative|urgent|opportunity",
  "keyPoints": ["detailed point 1", "detailed point 2", "..."],
  "suggestedReplies": {
    "professional": "strategic professional reply",
    "friendly": "warm engaging reply",
    "confident": "assertive value-driven reply"
  }
 }`;

    let userContent;
    if (image) {
      // If image is provided, use vision capability to extract text from image
      userContent = [
        { 
          type: "text", 
          text: message ? `Extract and analyze text from the image. Additional context: ${message}` : "Extract and analyze all text visible in this image." 
        },
        { 
          type: "image_url", 
          image_url: { url: image } 
        }
      ];
    } else {
      userContent = `Analyze this client message and suggest replies: "${message}"`;
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
    
    const aiResponse = JSON.parse(data.choices[0].message.content);

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
