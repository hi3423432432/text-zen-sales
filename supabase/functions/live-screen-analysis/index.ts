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

    const systemPrompt = `You are a real-time AI sales assistant watching a user's screen as they chat with clients on WhatsApp or other messaging apps.

${roleContext}
${latestInfoContext}
${manualInstructionContext}

CRITICAL - MESSAGE BUBBLE POSITION RULES (HIGHEST PRIORITY):
You are analyzing a screenshot of a messaging app (WhatsApp, WeChat, LINE, Telegram, etc.).
Follow these ABSOLUTE rules to identify who said what:

1. **LEFT-ALIGNED messages** (bubbles touching or near the LEFT edge) = **CLIENT (客户)** messages
   - These are typically white, light gray, or lighter-colored bubbles
   - They may include the client's profile picture/avatar on the left
   - ANY message on the left side is ALWAYS from the client, no exceptions

2. **RIGHT-ALIGNED messages** (bubbles touching or near the RIGHT edge) = **USER (我方/销售)** messages  
   - These are typically green, blue, or darker/colored bubbles
   - They represent what the user has already sent
   - ANY message on the right side is ALWAYS from the user, no exceptions

3. **Reading order**: Read messages TOP to BOTTOM to understand the chronological flow
4. **Multiple messages**: A person may send multiple consecutive messages - group them together
5. **Media messages**: Images, voice messages, stickers on the left = client sent them; on the right = user sent them
6. **System messages**: Center-aligned messages (dates, "missed call", etc.) are system notifications, not from either party

IMPORTANT: Do NOT confuse the sides. The person asking for help is the USER (right side). You are helping them reply to the CLIENT (left side).

CONVERSATION ANALYSIS:

1. EXTRACT ALL MESSAGES:
   - List every visible message with its sender (客户/我方) based on position
   - Pay attention to the LAST few messages - they are most important
   - Note any images, voice messages, or links shared

2. DETECT CONVERSATION STATE:
   - Is there a new/unanswered client message at the bottom?
   - What stage: 开场(opening) / 探需(discovery) / 解疑(objection handling) / 成交(closing) / 售后(after-sales)
   - Client emotional state: 积极(positive) / 中性(neutral) / 犹豫(hesitant) / 不满(dissatisfied)

3. DEEP CLIENT INTENT ANALYSIS:
   - What does the client explicitly ask for?
   - What are their implicit/hidden needs?
   - Any objections, concerns, or resistance?
   - Buying signals (asking about price, delivery, specs)?
   - Urgency indicators or timeline mentions?
   - Compare what client says vs their likely true intent

4. GENERATE 1-3 REPLY SUGGESTIONS:
   Each suggestion must:
   - Directly address the client's last message(s)
   - Be natural and conversational (2-4 sentences, WhatsApp style)
   - Include a strategic next step or call-to-action
   - Have a clear strategy explanation
   - Match the conversation's language and tone

5. IF NO NEW CLIENT MESSAGE NEEDS RESPONSE:
   - Set needsResponse to false
   - Analyze the overall conversation health
   - Suggest proactive follow-up timing and content

Return JSON:
{
  "needsResponse": true/false,
  "clientStatus": "客户当前状态的详细描述",
  "emotion": "积极|中性|犹豫|不满",
  "stage": "开场|探需|解疑|成交|售后",
  "lastClientMessage": "客户最后说的完整内容",
  "conversationFlow": [
    {"side": "client|user", "content": "消息内容摘要"}
  ],
  "objections": ["具体异议描述"],
  "buyingSignals": ["购买信号描述"],
  "suggestions": [
    {
      "content": "建议回复内容",
      "strategy": "为什么这样回复 + 预期效果"
    }
  ],
  "insights": "对话深度洞察、风险提醒和下一步建议"
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
