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
    const { screenshot, customInstructions, latestInfo, manualInstruction } = await req.json();
    console.log('Live screen analysis - has screenshot:', !!screenshot, 'has manual instruction:', !!manualInstruction);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    const systemPrompt = `You are a real-time AI sales assistant watching a user's screen as they chat with clients on WhatsApp.

${roleContext}
${latestInfoContext}
${manualInstructionContext}

CRITICAL - WHATSAPP VISUAL ANALYSIS:
You are seeing a live screenshot of the user's screen showing a WhatsApp conversation.
- LEFT SIDE messages (white/light bubbles) = CLIENT messages - what you need to analyze
- RIGHT SIDE messages (colored/green bubbles) = USER's messages - what they already said

REAL-TIME ANALYSIS REQUIREMENTS:

1. DETECT CONVERSATION STATE:
   - Is there a new client message that needs a response?
   - What stage is the conversation at? (开场/探需/解疑/成交/售后)
   - What is the client's emotional state? (积极/中性/犹豫/不满)

2. IDENTIFY CLIENT INTENT:
   - What does the client want or need?
   - Any objections or concerns?
   - Buying signals or hesitation?
   - Price sensitivity or urgency?

3. GENERATE REAL-TIME SUGGESTIONS:
   Provide 1-3 optimized reply suggestions for the user to send to the client.
   Each suggestion should:
   - Be concise (2-4 sentences for WhatsApp)
   - Address the client's specific points
   - Include a clear call-to-action
   - Have a strategy explanation

4. IF NO NEW MESSAGE DETECTED:
   - Set needsResponse to false
   - Provide general insights about the conversation
   - Suggest proactive follow-up actions

Return JSON:
{
  "needsResponse": true/false,
  "clientStatus": "客户状态描述",
  "emotion": "积极|中性|犹豫|不满",
  "stage": "开场|探需|解疑|成交|售后",
  "lastClientMessage": "客户最后说的话（如果检测到）",
  "objections": ["异议1", "异议2"],
  "suggestions": [
    {
      "content": "回复内容",
      "strategy": "策略说明"
    }
  ],
  "insights": "对话洞察和建议"
}`;

    const userContent = [
      { 
        type: "text", 
        text: manualInstruction 
          ? `分析这个WhatsApp屏幕截图，根据用户指令生成回复：${manualInstruction}`
          : "分析这个WhatsApp屏幕截图，识别客户消息并推荐最佳回复。" 
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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    
    const aiResponse = JSON.parse(content);
    console.log('Live analysis result:', aiResponse);

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in live-screen-analysis function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
