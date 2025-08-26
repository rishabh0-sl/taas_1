import { logger } from './logger.js';
import fetch from 'node-fetch';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  async generateTestScenarios(objective: string, url: string, credentials?: { username: string; password?: string }): Promise<string> {
    try {
      const prompt = this.buildPrompt(objective, url, credentials);
      
      const request: GeminiRequest = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      };

      logger.info('Sending request to Gemini API...');
      
      const response = await fetch(`${this.config.baseUrl}/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as GeminiResponse;
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      logger.info('Successfully received response from Gemini API');
      
      return generatedText;

    } catch (error) {
      logger.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  private buildPrompt(objective: string, url: string, credentials?: { username: string; password?: string }): string {
    return `You are a test automation expert. Generate comprehensive test scenarios based on the following requirements:

OBJECTIVE: ${objective}
TARGET URL: ${url}
${credentials ? `CREDENTIALS: Username: ${credentials.username}${credentials.password ? `, Password: ${credentials.password}` : ''}` : ''}

Please generate AT LEAST 5 test scenarios in the following JSON format:

{
  "scenarios": [
    {
      "id": "scn_1",
      "name": "Scenario Name",
      "steps": [
        {
          "action": "goto|fill|click|expect|wait|type|select|hover",
          "target": "ID selector only (e.g., #username, #login-button, #search-input)",
          "data": "input data (for fill/type actions)",
          "description": "Human readable step description"
        }
      ],
      "tags": ["tag1", "tag2"]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Generate AT LEAST 5 different test scenarios
2. Use ONLY ID selectors (#element-id) for the target field
3. DO NOT use CSS classes, data attributes, or other selectors
4. Include both positive and negative test cases
5. Cover different user flows and edge cases
6. Use realistic test data
7. Add appropriate wait times for dynamic content
8. Use descriptive step descriptions
9. Tag scenarios appropriately (smoke, regression, auth, etc.)

Example target values:
- "#username" (not ".username" or "[data-testid='username']")
- "#login-button" (not "button[type='submit']" or ".btn-primary")
- "#search-input" (not "input[placeholder='Search']" or ".search-field")

Generate comprehensive scenarios that thoroughly test the given objective using only ID-based selectors.`;
  }

  async parseGeminiResponse(response: string): Promise<any> {
    try {
      // Extract JSON from the response (Gemini might include markdown formatting)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      
      // Try to find JSON object in the text
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      throw new Error('Could not extract JSON from Gemini response');
      
    } catch (error) {
      logger.error('Error parsing Gemini response:', error);
      throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
