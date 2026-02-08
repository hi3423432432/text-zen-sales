export interface ChatMessage {
  id: string;
  role: 'client' | 'me';
  content: string;
  timestamp: Date;
  senderName?: string;
}

export interface SuggestionItem {
  id: string;
  content: string;
  strategy: string;
  isCustom?: boolean;
}

export interface ClientAnalysis {
  emotion: '积极' | '中性' | '犹豫' | '不满';
  stage: '开场' | '探需' | '解疑' | '成交' | '售后';
  potentialNeeds: string[];
  objections: string[];
  status: string;
}
