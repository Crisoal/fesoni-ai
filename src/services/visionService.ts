// src/services/visionService.ts

interface VisionAnalysisResult {
  aesthetics: Array<{ name: string; confidence: number }>;
  colors: Array<{ name: string; hex: string; confidence: number }>;
  textures: Array<{ name: string; confidence: number }>;
  silhouettes: Array<{ name: string; confidence: number }>;
  mood: Array<{ name: string; confidence: number }>;
  overallStyle: string;
  description: string;
  searchKeywords: string[];
}

export class VisionService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async analyzeStyleFromImage(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional fashion stylist and AI vision expert. Analyze the uploaded image and extract detailed style information. Focus on:

1. AESTHETICS: Identify specific style movements (minimalist, cottagecore, dark academia, streetwear, boho, etc.)
2. COLORS: Extract the main color palette with hex codes and confidence scores
3. TEXTURES: Identify fabric textures and material qualities visible
4. SILHOUETTES: Describe the shapes, cuts, and fits of garments
5. MOOD: Capture the emotional tone and vibe of the outfit
6. SEARCH KEYWORDS: Generate specific product search terms for finding similar items

Provide confidence scores (0-1) for each element based on how clearly visible and identifiable they are in the image.

Respond in JSON format:
{
  "aesthetics": [{"name": "aesthetic_name", "confidence": 0.95}],
  "colors": [{"name": "color_name", "hex": "#hexcode", "confidence": 0.90}],
  "textures": [{"name": "texture_name", "confidence": 0.85}],
  "silhouettes": [{"name": "silhouette_name", "confidence": 0.88}],
  "mood": [{"name": "mood_descriptor", "confidence": 0.92}],
  "overallStyle": "comprehensive_style_description",
  "description": "detailed_analysis_paragraph",
  "searchKeywords": ["keyword1", "keyword2", "keyword3"]
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please analyze this fashion image and extract detailed style information including aesthetics, colors, textures, silhouettes, and mood. Provide confidence scores and generate search keywords for finding similar products.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No analysis content received');
      }

      // Extract JSON from markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const analysis = JSON.parse(jsonString) as VisionAnalysisResult;

      // Validate and ensure all required fields are present
      return {
        aesthetics: analysis.aesthetics || [],
        colors: analysis.colors || [],
        textures: analysis.textures || [],
        silhouettes: analysis.silhouettes || [],
        mood: analysis.mood || [],
        overallStyle: analysis.overallStyle || 'Contemporary Style',
        description: analysis.description || 'Style analysis completed',
        searchKeywords: analysis.searchKeywords || []
      };

    } catch (error) {
      console.error('Vision analysis error:', error);
      
      // Return fallback analysis
      return {
        aesthetics: [
          { name: 'Contemporary', confidence: 0.7 },
          { name: 'Casual', confidence: 0.6 }
        ],
        colors: [
          { name: 'Neutral', hex: '#8B8B8B', confidence: 0.8 }
        ],
        textures: [
          { name: 'Smooth', confidence: 0.6 }
        ],
        silhouettes: [
          { name: 'Relaxed', confidence: 0.7 }
        ],
        mood: [
          { name: 'Casual', confidence: 0.8 }
        ],
        overallStyle: 'Contemporary Casual',
        description: 'Unable to fully analyze image. Please try uploading a clearer image with better lighting.',
        searchKeywords: ['casual', 'contemporary', 'everyday']
      };
    }
  }

  // Convert base64 data URL to base64 string
  private extractBase64FromDataUrl(dataUrl: string): string {
    const base64Index = dataUrl.indexOf(',');
    return base64Index !== -1 ? dataUrl.substring(base64Index + 1) : dataUrl;
  }

  async analyzeImageFromUrl(imageUrl: string): Promise<VisionAnalysisResult> {
    // Convert image URL to base64 for analysis
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = this.extractBase64FromDataUrl(dataUrl);
          this.analyzeStyleFromImage(base64).then(resolve).catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image URL to base64:', error);
      throw new Error('Failed to process image URL');
    }
  }
}