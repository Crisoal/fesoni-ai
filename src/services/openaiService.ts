// src/services/openaiService.ts

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Define the type for style analysis response
interface StyleAnalysis {
  aesthetics?: string[];
  productTypes?: string[];
  budget?: string | null;
  specificItems?: string[];
  lifestyle?: string;
}

export interface AnalysisResponse {
  styleAnalysis: StyleAnalysis;
  followUpQuestions: string[];
  recommendedCategories: string[];
}

export class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to get AI response. Please check your API configuration.');
    }
  }

  async analyzeStylePreferences(userInput: string): Promise<AnalysisResponse> {
    const systemPrompt = `You are Fesoni, an expert AI shopping assistant specializing in style analysis and product discovery. 
    Analyze the user's style preferences and shopping needs. Extract:
    1. Style aesthetics (e.g., minimalist, cottagecore, dark academia, etc)
    2. Product categories needed (clothing, accessories, home decor, etc.)
    3. Budget preferences if mentioned
    4. Specific items requested
    5. Lifestyle context (work, casual, events)
    Generate intelligent follow-up questions to better understand their style.
    Suggest relevant Amazon product search categories.
    Respond in JSON format:
    {
      "styleAnalysis": {
        "aesthetics": ["aesthetic1", "aesthetic2"],
        "productTypes": ["category1", "category2"],
        "budget": "budget_range_or_null",
        "specificItems": ["item1", "item2"],
        "lifestyle": "context_description"
      },
      "followUpQuestions": ["question1", "question2"],
      "recommendedCategories": ["category1", "category2"]
    }`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    try {
      const response = await this.chat(messages);
      
      // Extract JSON from markdown code blocks if present
      let jsonString = response.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedResponse = JSON.parse(jsonString) as AnalysisResponse;
      return parsedResponse;

    } catch (error) {
      console.error('Style analysis error:', error);
      return {
        styleAnalysis: {
          aesthetics: [],
          productTypes: [],
          budget: null,
          specificItems: [],
          lifestyle: ''
        },
        followUpQuestions: ['Could you tell me more about your style preferences?'],
        recommendedCategories: ['clothing', 'accessories']
      };
    }
  }
}