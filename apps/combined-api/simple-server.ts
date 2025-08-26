import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';

// Compilation schema
const CompilationRequestSchema = z.object({
  scenario: z.object({
    id: z.string(),
    name: z.string(),
    steps: z.array(z.object({
      action: z.string(),
      target: z.string(),
      data: z.any().optional(),
      description: z.string()
    }))
  }),
  options: z.object({
    emitPageObjects: z.boolean().default(true),
    selectorStrategy: z.enum(['role-first', 'css']).default('role-first'),
    fileName: z.string().default('generated_test.spec.ts'),
    suiteId: z.string().default('suite_generated'),
    runId: z.string().optional()
  })
});

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDP1u8Ba-XHL5as5jR_i5UKwaAkKTRaKT8';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';

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
      case 'fill':
      case 'type':
        testCode += `${indent}// Fill input field\n`;
        if (options.selectorStrategy === 'role-first' && step.target.startsWith('role=')) {
          const roleMatch = step.target.match(/role=([^[\]]+)(?:\[([^\]]+)\])?/);
          if (roleMatch) {
            const role = roleMatch[1];
            const name = roleMatch[2] ? roleMatch[2].replace(/name=['"]([^'"]+)['"]/, '$1') : undefined;
            if (name) {
              testCode += `${indent}await page.getByRole('${role}', { name: '${name}' }).fill('${step.data || ''}');\n`;
            } else {
              testCode += `${indent}await page.locator('${step.target}').fill('${step.data || ''}');\n`;
            }
          } else {
            testCode += `${indent}await page.locator('${step.target}').fill('${step.data || ''}');\n`;
          }
        } else {
          testCode += `${indent}await page.locator('${step.target}').fill('${step.data || ''}');\n`;
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
      case 'wait':
        testCode += `${indent}// Wait for element\n`;
        testCode += `${indent}await page.waitForSelector('${step.target}');\n`;
        break;
      default:
        testCode += `${indent}// ${step.action}: ${step.description}\n`;
        testCode += `${indent}await page.locator('${step.target}').${step.action}();\n`;
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

// Generate test scenarios using Gemini API directly
async function generateTestScenarios(input: any): Promise<any> {
  try {
    const prompt = `Generate test scenarios for the following objective: "${input.objective}"
    
Target URL: ${input.url}
Credentials: ${input.credentials ? `Username: ${input.credentials.username}, Password: ${input.credentials.password || 'hidden'}` : 'None'}

Please generate 3-5 test scenarios in the following JSON format:
{
  "scenarios": [
    {
      "id": "scn_1",
      "name": "Scenario Name",
      "steps": [
        {
          "action": "goto|click|fill|expect|wait|type",
          "target": "selector or URL",
          "data": "input data if needed",
          "description": "Human readable description"
        }
      ],
      "tags": ["smoke", "regression", "etc"]
    }
  ]
}

Focus on realistic test scenarios that would validate the functionality described in the objective.`;

    const response = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Try to extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        if (parsedResponse.scenarios && Array.isArray(parsedResponse.scenarios)) {
          return parsedResponse.scenarios;
        }
      } catch (parseError) {
        console.log('Failed to parse JSON response from Gemini');
      }
    }
    
    // Return empty array if parsing fails - no fallback
    return [];
    
  } catch (error) {
    console.error('Error generating scenarios with Gemini API:', error);
    return [];
  }
}

// Start server
const start = async () => {
  try {
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

    // Generate scenarios endpoint
    fastify.post('/api/v1/generate', async (request, reply) => {
      try {
        const startTime = Date.now();
        
        // Generate scenarios
        const scenarios = await generateTestScenarios(request.body as any);
        
        const totalTime = Date.now() - startTime;
        const runId = (request.body as any).runId || `run_${Date.now()}`;

        // Create output format
        const result = {
          runId: `${runId}_mcp`,
          outputs: scenarios.map((scenario: any) => ({ scenario })),
          metadata: {
            generatedAt: new Date().toISOString(),
            model: GEMINI_MODEL,
            totalTime: `${totalTime}ms`,
            source: 'gemini_generated',
            mcpValidationSuccessful: false,
            stage: 'generation_complete'
          }
        };
        
        return result;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ 
          error: 'Failed to generate scenarios',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Compile to Playwright endpoint
    fastify.post('/api/v1/compile', async (request, reply) => {
      try {
        const validatedRequest = CompilationRequestSchema.parse(request.body);
        
        // Simple Playwright test generation
        const runId = validatedRequest.options.runId || `run_${Date.now()}`;
        const testFileName = validatedRequest.options.fileName;
        
        // Generate Playwright test code
        const testCode = generatePlaywrightTest(validatedRequest.scenario, validatedRequest.options);
        
        // Generate page objects if requested
        const pageObjects = validatedRequest.options.emitPageObjects ? 
          generatePageObjects(validatedRequest.scenario) : [];
        
        const result = {
          runId,
          ir: {
            suiteId: validatedRequest.options.suiteId,
            cases: [{
              id: `case_${validatedRequest.scenario.id}`,
              name: validatedRequest.scenario.name,
              steps: validatedRequest.scenario.steps.map(step => ({
                type: step.action,
                url: step.action === 'goto' ? step.target : undefined,
                selector: step.action !== 'goto' ? step.target : undefined,
                value: step.data
              }))
            }]
          },
          artifacts: {
            testFileName,
            pageObjects,
            ts: testCode
          }
        };
        
        return result;
      } catch (error) {
        fastify.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ 
            error: 'Validation error',
            details: error.errors
          });
        }
        return reply.status(500).send({ 
          error: 'Failed to compile scenario',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🚀 Simple Combined API server running on http://localhost:3002');
    console.log('📝 Generate scenarios: POST /api/v1/generate');
    console.log('⚡ Compile to Playwright: POST /api/v1/compile');
    console.log('🔑 Using Gemini API key:', GEMINI_API_KEY.substring(0, 10) + '...');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
