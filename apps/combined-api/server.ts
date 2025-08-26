import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '..', 'config', 'config.env') });

// Gemini configuration from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

// Create results directory if it doesn't exist
const resultsDir = path.join(process.cwd(), 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Helper function to save JSON files with timestamp
function saveToResultsFolder(data: any, prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${prefix}_${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${prefix} to: ${filepath}`);
  
  return filename;
}

// Initialize Gemini service
let geminiService: any; // Changed to any as we are not using compiler-core directly

// Valid actions for test scenarios
const ALLOWED_ACTIONS = ['goto', 'fill', 'click', 'expect'];

// Validate scenario actions
function validateScenarioActions(scenarios: any): boolean {
  if (!scenarios.scenarios && !Array.isArray(scenarios)) {
    return false;
  }
  
  const scenarioArray = scenarios.scenarios || scenarios;
  
  for (const scenario of scenarioArray) {
    if (!scenario.steps || !Array.isArray(scenario.steps)) {
      return false;
    }
    
    for (const step of scenario.steps) {
      if (!ALLOWED_ACTIONS.includes(step.action)) {
        console.log(`❌ Invalid action found: ${step.action}. Allowed actions: ${ALLOWED_ACTIONS.join(', ')}`);
        return false;
      }
    }
  }
  
  return true;
}

// Generate Playwright test code
function generatePlaywrightTest(scenario: any, options: any): string {
  const testName = scenario.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ');
  
  let testCode = `import { test, expect } from '@playwright/test';\n\n`;
  testCode += `test('${testName}', async ({ page }) => {\n`;
  
  scenario.steps.forEach((step: any, index: number) => {
    const indent = '  ';
    
    switch (step.action) {
      case 'goto':
        testCode += `${indent}// Navigate to the page\n`;
        testCode += `${indent}await page.goto('${step.target}');\n`;
        break;
      case 'fill':
        testCode += `${indent}// Fill input field\n`;
        if (options.selectorStrategy === 'role-first' && step.target.startsWith('role=')) {
          const roleMatch = step.target.match(/role=([^[\]]+)(?:\[([^\]]+)\])?/);
          if (roleMatch) {
            const role = roleMatch[1];
            const name = roleMatch[2] ? roleMatch[2].replace(/name=['"]([^'"]+)['"]/, '$1') : undefined;
            if (name) {
              testCode += `${indent}await page.getByRole('${role}', { name: '${name}' }).fill('${step.data || ''}');\n`;
            } else {
              testCode += `${indent}await page.getByRole('${role}').fill('${step.data || ''}');\n`;
            }
          } else {
            testCode += `${indent}await page.locator('${step.target}').fill('${step.data || ''}');\n`;
          }
        } else {
          testCode += `${indent}await page.locator('${step.target}').fill('${step.data || ''}');\n`;
        }
        break;
      case 'click':
        testCode += `${indent}// Click on element\n`;
        if (options.selectorStrategy === 'role-first' && step.target.startsWith('role=')) {
          const roleMatch = step.target.match(/role=([^[\]]+)(?:\[([^\]]+)\])?/);
          if (roleMatch) {
            const role = roleMatch[1];
            const name = roleMatch[2] ? roleMatch[2].replace(/name=['"]([^'"]+)['"]/, '$1') : undefined;
            if (name) {
              testCode += `${indent}await page.getByRole('${role}', { name: '${name}' }).click();\n`;
            } else {
              testCode += `${indent}await page.getByRole('${role}').click();\n`;
            }
          } else if (step.target.startsWith('text=')) {
            const text = step.target.replace('text=', '');
            testCode += `${indent}await page.getByText('${text}').click();\n`;
          } else {
            testCode += `${indent}await page.locator('${step.target}').click();\n`;
          }
        } else if (step.target.startsWith('text=')) {
          const text = step.target.replace('text=', '');
          testCode += `${indent}await page.getByText('${text}').click();\n`;
        } else {
          testCode += `${indent}await page.locator('${step.target}').click();\n`;
        }
        break;
      case 'expect':
        testCode += `${indent}// Verify element\n`;
        if (step.data && step.data.includes('visible')) {
          testCode += `${indent}await expect(page.locator('${step.target}')).toBeVisible();\n`;
        } else if (step.data && step.data.includes('text')) {
          const textMatch = step.data.match(/contains '([^']+)'/);
          if (textMatch) {
            testCode += `${indent}await expect(page.locator('${step.target}')).toContainText('${textMatch[1]}');\n`;
          } else {
            testCode += `${indent}await expect(page.locator('${step.target}')).toBeVisible();\n`;
          }
        } else {
          testCode += `${indent}await expect(page.locator('${step.target}')).toBeVisible();\n`;
        }
        break;
      default:
        testCode += `${indent}// Unknown action: ${step.action}\n`;
        testCode += `${indent}// ${step.description}\n`;
    }
    
    if (index < scenario.steps.length - 1) {
      testCode += '\n';
    }
  });
  
  testCode += `});\n`;
  return testCode;
}

// Generate page objects
function generatePageObjects(scenario: any): string[] {
  const pageObjects: string[] = [];
  
  // Extract unique page names from steps
  const pageNames = new Set<string>();
  scenario.steps.forEach((step: any) => {
    if (step.action === 'goto') {
      const url = step.target;
      if (url.includes('amazon')) pageNames.add('Amazon');
      else if (url.includes('shop')) pageNames.add('Shop');
      else if (url.includes('login')) pageNames.add('Login');
      else pageNames.add('Main');
    }
  });
  
  pageNames.forEach(pageName => {
    pageObjects.push(`pages/${pageName}Page.ts`);
  });
  
  return pageObjects;
}

// Generate test scenarios using Gemini
async function generateTestScenarios(input: any): Promise<any> {
  try {
    // Generate scenarios using Gemini API
    const geminiResponse = await geminiService.generateTestScenarios(
      input.objective,
      input.url,
      input.credentials
    );
    
    // Parse the Gemini response
    const parsedResponse = await geminiService.parseGeminiResponse(geminiResponse);
    
    if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    // Convert Gemini response to TestScenario format
    const scenarios = parsedResponse.scenarios.map((scenario: any, index: number) => ({
      id: scenario.id || `scn_${index + 1}`,
      name: scenario.name || `Generated Scenario ${index + 1}`,
      steps: scenario.steps.map((step: any, stepIndex: number) => ({
        action: step.action || 'click',
        target: step.target || '#body',
        data: step.data,
        description: step.description || `Step ${stepIndex + 1}`
      })),
      tags: scenario.tags || ['generated']
    }));
    
    // Return scenarios as-is, no minimum requirement
    return scenarios;
    
  } catch (error) {
    console.error('Error generating scenarios with Gemini API:', error);
    
    // Return empty array if Gemini fails - no fallback
    return [];
  }
}

// Start server
const start = async () => {
  try {
    // Initialize Gemini service
    geminiService = {
      generateTestScenarios: async (objective: string, url: string, credentials: any) => {
        console.log('Simulating Gemini API call for generateTestScenarios');
        console.log('Objective:', objective);
        console.log('URL:', url);
        console.log('Credentials:', credentials);

        // Simulate a response from the Gemini API
        const mockResponse = {
          candidates: [{
            content: {
              parts: [{
                text: `{
  "scenarios": [
    {
      "id": "scenario_1",
      "name": "Scenario name",
      "description": "Detailed description",
      "steps": [
        {
          "action": "navigate",
          "target": "https://example.com",
          "data": null,
          "description": "Navigate to the website"
        },
        {
          "action": "click",
          "target": "button[data-testid='login']",
          "data": null,
          "description": "Click on login button"
        }
      ]
    }
  ]
}`
              }]
            }
          }]
        };
        return mockResponse;
      },
      parseGeminiResponse: async (response: any) => {
        console.log('Simulating Gemini response parsing');
        return {
          scenarios: [
            {
              id: 'scn_1',
              name: 'Scenario name',
              steps: [
                { action: 'navigate', target: 'https://example.com', data: null, description: 'Navigate to the website' },
                { action: 'click', target: 'button[data-testid="login"]', data: null, description: 'Click on login button' }
              ],
              tags: ['generated']
            }
          ]
        };
      }
    };
    
    const fastify = Fastify({
      logger: true
    });

    // Register CORS
    await fastify.register(cors, {
      origin: true
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // List results files endpoint
    fastify.get('/api/v1/results', async (request, reply) => {
      try {
        const files = fs.readdirSync(resultsDir)
          .filter(file => file.endsWith('.json'))
          .map(file => {
            const filepath = path.join(resultsDir, file);
            const stats = fs.statSync(filepath);
            return {
              filename: file,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            };
          })
          .sort((a, b) => b.modified.getTime() - a.modified.getTime());
        
        return {
          resultsDir,
          totalFiles: files.length,
          files
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ 
          error: 'Failed to list results',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Generate scenarios endpoint
    fastify.post('/api/v1/generate', async (request, reply) => {
      try {
        const startTime = Date.now();
        const body = request.body as any;
        console.log('📝 Generate request received:', body);

        // Call Gemini API
        const response = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate test scenarios for the following test objective: ${body.objective || body.testObjective}
            
Target URL: ${body.url || body.targetUrl}
Username: ${body.credentials?.username || body.username || 'N/A'}
Password: ${body.credentials?.password || body.password || 'N/A'}

IMPORTANT: Use ONLY these 4 actions in your scenarios:
- "goto": Navigate to a URL
- "fill": Fill in form fields with data
- "click": Click on elements
- "expect": Verify/assert that something is present or correct

Please generate 2-3 realistic test scenarios in the following JSON format:
{
  "scenarios": [
    {
      "id": "scenario_1",
      "name": "Scenario name",
      "description": "Detailed description",
      "steps": [
        {
          "action": "goto",
          "target": "https://example.com",
          "data": null,
          "description": "Navigate to the website"
        },
        {
          "action": "fill",
          "target": "input[name='username']",
          "data": "testuser",
          "description": "Enter username in the username field"
        },
        {
          "action": "click",
          "target": "button[type='submit']",
          "data": null,
          "description": "Click on the submit button"
        },
        {
          "action": "expect",
          "target": ".welcome-message",
          "data": null,
          "description": "Verify that welcome message is displayed"
        }
      ]
    }
  ]
}

Make sure the scenarios are realistic and cover different aspects of the functionality. Use ONLY the 4 specified actions.`
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('🤖 Gemini API response received');
        console.log('📄 Full Gemini response:', JSON.stringify(result, null, 2));

        let scenarios;
        try {
          // Try to parse the response
          const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('📝 Extracted content:', content);
          
          if (content) {
            // Extract JSON from the response text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              scenarios = JSON.parse(jsonMatch[0]);
              console.log('✅ Successfully parsed Gemini response');
              console.log('🎯 Parsed scenarios:', JSON.stringify(scenarios, null, 2));
            } else {
              console.log('❌ No JSON found in content');
              throw new Error('No JSON found in response');
            }
          } else {
            console.log('❌ No content in Gemini response');
            throw new Error('Invalid response structure');
          }
        } catch (parseError) {
          console.log('❌ Failed to parse JSON response from Gemini:', parseError);
          // Instead of throwing, return empty scenarios with error info
          scenarios = { scenarios: [] };
        }

        // Validate that only allowed actions are used
        if (!validateScenarioActions(scenarios)) {
          console.log('❌ Generated scenarios contain invalid actions');
          throw new Error('Generated scenarios contain invalid actions. Only goto, fill, click, and expect are allowed.');
        }

        // Save the generated scenarios to results folder
        const savedFilename = saveToResultsFolder(scenarios, 'gemini_scenarios');
        
        // NEW: Automatically compile each scenario to Playwright and save .spec.ts files
        console.log('🚀 Starting automatic compilation to Playwright...');
        const compilationResults = [];
        const compilationErrors = [];
        
        const scenarioArray = scenarios.scenarios || scenarios;
        for (let i = 0; i < scenarioArray.length; i++) {
          const scenario = scenarioArray[i];
          try {
            console.log(`📝 Compiling scenario ${i + 1}: ${scenario.name}`);
            
            // Generate Playwright test code
            const testCode = generatePlaywrightTest(scenario, {
              emitPageObjects: true,
              selectorStrategy: 'role-first',
              fileName: `${scenario.name.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}_${Date.now()}.spec.ts`,
              suiteId: `suite_${scenario.id}`
            });
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const specFileName = `${scenario.name.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}_${timestamp}.spec.ts`;
            
            // Save to SL12 results folder
            const specFilePath = path.join(resultsDir, specFileName);
            fs.writeFileSync(specFilePath, testCode);
            console.log(`💾 Saved Playwright test to SL12 results: ${specFilePath}`);
            
            // NEW: Also save to DEFLAKE tests folder
            const deflakeTestsDir = path.join(process.cwd(), '..', '..', 'packages', 'deflake', 'tests');
            const deflakeSpecFilePath = path.join(deflakeTestsDir, specFileName);
            
            // Ensure DEFLAKE tests directory exists
            if (!fs.existsSync(deflakeTestsDir)) {
              fs.mkdirSync(deflakeTestsDir, { recursive: true });
            }
            
            // Save to DEFLAKE tests folder
            fs.writeFileSync(deflakeSpecFilePath, testCode);
            console.log(`💾 Saved Playwright test to DEFLAKE tests: ${deflakeSpecFilePath}`);
            
            compilationResults.push({
              scenarioName: scenario.name,
              fileName: specFileName,
              success: true
            });
            
          } catch (compilationError) {
            console.error(`❌ Failed to compile scenario ${scenario.name}:`, compilationError);
            compilationErrors.push({
              scenarioName: scenario.name,
              error: compilationError instanceof Error ? compilationError.message : 'Unknown compilation error',
              success: false
            });
          }
        }
        
        // Structure response to match UI expectations with compilation results
        const responseWithMetadata = {
          runId: `run_${Date.now()}_mcp`,
          outputs: scenarios.scenarios || scenarios, // Handle both direct scenarios and nested scenarios
          metadata: {
            generatedAt: new Date().toISOString(),
            model: GEMINI_MODEL,
            totalTime: Date.now() - startTime,
            source: 'gemini_generated_and_compiled',
            mcpValidationSuccessful: false,
            stage: 'generation_and_compilation_complete',
            savedToFile: savedFilename,
            compilationResults: {
              successful: compilationResults,
              failed: compilationErrors,
              totalScenarios: scenarioArray.length,
              successfulCompilations: compilationResults.length,
              failedCompilations: compilationErrors.length
            }
          }
        };

        return responseWithMetadata;
      } catch (error) {
        console.error('❌ Error in generate endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to generate scenarios', details: errorMessage });
      }
    });

    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🚀 Combined API server running on http://localhost:3002');
    console.log('📝 Generate scenarios: POST /api/v1/generate');
    console.log('📁 Results API: GET /api/v1/results');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
