import { logger } from './logger.js';
import Ajv from 'ajv';
import { prdIntakeSchema, scenarioSchema, llmRunSchema } from '@ptosmcpllm/contracts';
import { GeminiService } from './gemini-service.js';
import { config } from './config.js';
import { MCPClient } from './mcp-client.js';

export interface PRDIntake {
  objective: string;
  url: string;
  credentials?: {
    username: string;
    password?: string;
    secretRef?: string;
  };
  runId?: string;
}

export interface TestStep {
  action: 'goto' | 'fill' | 'click' | 'expect' | 'wait' | 'type' | 'select' | 'hover';
  target: string;
  data?: string;
  description: string;
}

export interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
  timeTakenToCompile?: string;
  tags?: string[];
}

export interface LLMRunOutput {
  runId: string;
  outputs: Array<{
    scenario: TestScenario;
  }>;
  metadata?: {
    generatedAt: string;
    model: string;
    totalTime?: string;
    source?: string;
    mcpValidationSuccessful?: boolean;
    stage?: string;
  };
}

export interface GenerationResult {
  geminiOutput: LLMRunOutput;
  mcpOutput: LLMRunOutput;
  mainOutput: LLMRunOutput; // For backward compatibility
  mcpValidationSuccessful: boolean;
}

export class LLMCompiler {
  private geminiService: GeminiService;
  private mcpClient: MCPClient;
  private ajv: Ajv;

  constructor() {
    this.geminiService = new GeminiService({
      apiKey: config.gemini.apiKey,
      model: config.gemini.model,
      baseUrl: config.gemini.baseUrl
    });
    
    // Initialize MCP client to connect to external Playwright MCP server
    this.mcpClient = new MCPClient();
    
    this.ajv = new Ajv();
    this.ajv.addSchema(prdIntakeSchema, 'prd_intake');
    this.ajv.addSchema(scenarioSchema, 'scenario');
    this.ajv.addSchema(llmRunSchema, 'llm_run');
  }

  async generateScenarios(input: PRDIntake): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validate = this.ajv.getSchema('prd_intake');
      if (!validate || !validate(input)) {
        throw new Error(`Invalid input: ${this.ajv.errorsText(validate?.errors)}`);
      }

      // Generate scenarios using Gemini API
      const scenarios = await this.generateGeminiScenarios(input);
      
      // Save Gemini results immediately after generation (BEFORE MCP processing)
      const geminiRunId = input.runId || `run_${Date.now()}`;
      const geminiOutput: LLMRunOutput = {
        runId: `${geminiRunId}_gemini`,
        outputs: scenarios.map(scenario => ({ scenario })),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: config.gemini.model,
          source: 'gemini_only',
          stage: 'before_mcp_processing'
        }
      };
      
      // Try to connect to external MCP server and execute scenarios
      let improvedScenarios = scenarios;
      let mcpValidationSuccessful = false;
      
      try {
        logger.info('Attempting to connect to external MCP server...');
        const connected = await this.mcpClient.connect();
        
        if (connected) {
          logger.info('Successfully connected to external MCP server, executing scenarios...');
          improvedScenarios = await this.validateSelectorsWithMCP(input.url, scenarios);
          mcpValidationSuccessful = true;
          logger.info('MCP execution and validation completed successfully');
        } else {
          logger.warn('Failed to connect to external MCP server, using original Gemini scenarios');
          mcpValidationSuccessful = false;
        }
      } catch (mcpError) {
        logger.warn('MCP execution failed, using original Gemini scenarios:', mcpError);
        // Keep the original scenarios if MCP execution fails
        improvedScenarios = scenarios;
        mcpValidationSuccessful = false;
      } finally {
        // Always disconnect from MCP server
        this.mcpClient.disconnect();
      }

      const totalTime = Date.now() - startTime;
      const runId = input.runId || `run_${Date.now()}`;

      // Create MCP output (improved scenarios) AFTER MCP processing
      const mcpOutput: LLMRunOutput = {
        runId: `${runId}_mcp`,
        outputs: improvedScenarios.map(scenario => ({ scenario })),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: config.gemini.model,
          totalTime: `${totalTime}ms`,
          source: 'gemini_plus_mcp',
          mcpValidationSuccessful,
          stage: 'after_mcp_processing'
        }
      };

      // Return both outputs for the API to save separately
      return {
        geminiOutput,
        mcpOutput,
        mainOutput: mcpOutput, // For backward compatibility
        mcpValidationSuccessful
      };

    } catch (error) {
      logger.error('Error generating scenarios:', error);
      throw error;
    }
  }

  private async validateSelectorsWithMCP(url: string, scenarios: TestScenario[]): Promise<TestScenario[]> {
    // This method will use the external MCP server configured in Cursor
    // to actually execute the scenarios and validate selectors in real-time
    
    logger.info('Executing scenarios with external MCP server for real-time selector validation...');
    
    const improvedScenarios = await Promise.all(
      scenarios.map(async (scenario) => {
        logger.info(`Executing scenario: ${scenario.name} (ID: ${scenario.id})`);
        
        try {
          // Execute the scenario step by step using MCP server
          const scenarioStartTime = Date.now();
          const improvedSteps = await this.executeScenarioWithMCP(url, scenario.steps);
          const scenarioTime = Date.now() - scenarioStartTime;
          
          return {
            ...scenario,
            steps: improvedSteps,
            timeTakenToCompile: `${scenarioTime}ms`
          };
        } catch (error) {
          logger.warn(`Failed to execute scenario ${scenario.id}, using original steps:`, error);
          return scenario; // Return original if execution fails
        }
      })
    );
    
    return improvedScenarios;
  }

  private async executeScenarioWithMCP(url: string, steps: TestStep[]): Promise<TestStep[]> {
    // Execute each step using the MCP server's Playwright tools
    // This will actually run the browser and validate selectors
    
    const improvedSteps: TestStep[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      logger.info(`Executing step ${i + 1}: ${step.action} on ${step.target}`);
      
      try {
        // Execute the step and get improved selector
        const improvedStep = await this.executeStepWithMCP(step, url, i === 0);
        improvedSteps.push(improvedStep);
        
        // Add small delay between steps for stability
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.warn(`Step ${i + 1} failed, using original:`, error);
        improvedSteps.push(step);
      }
    }
    
    return improvedSteps;
  }

  private async executeStepWithMCP(step: TestStep, url: string, isFirstStep: boolean): Promise<TestStep> {
    // This method will call the MCP server's Playwright tools to execute the step
    // and return an improved version with validated selectors
    
    let improvedTarget = step.target;
    let improvedDescription = step.description;
    
    try {
      // For the first step (goto), we need to navigate to the URL
      if (isFirstStep && step.action === 'goto') {
        logger.info(`Navigating to URL: ${url}`);
        const result = await this.mcpClient.executeStep('goto', url);
        
        if (result.success) {
          improvedDescription = `Successfully navigated to ${url}`;
        } else {
          logger.warn(`Navigation failed: ${result.error}`);
        }
      }
      
      // For other steps, validate and improve selectors
      if (step.action === 'click' || step.action === 'fill' || step.action === 'expect') {
        logger.info(`Validating selector: ${step.target}`);
        
        // First validate the selector
        const validationResult = await this.mcpClient.validateSelector(step.target);
        
        if (validationResult.success && validationResult.improvedSelector) {
          improvedTarget = validationResult.improvedSelector;
          logger.info(`Selector improved from "${step.target}" to "${improvedTarget}"`);
        }
        
        // Then execute the step with the improved selector
        const executionResult = await this.mcpClient.executeStep(step.action, improvedTarget, step.data);
        
        if (executionResult.success) {
          logger.info(`Successfully executed ${step.action} on ${improvedTarget}`);
          
          // Update description to reflect successful execution
          if (step.action === 'click') {
            const buttonText = step.description.replace(/^click on /i, '').replace(/^click /i, '');
            improvedDescription = `Successfully clicked on "${buttonText}" (validated selector: ${improvedTarget})`;
          } else if (step.action === 'fill') {
            const fieldName = step.description.replace(/^enter /i, '').replace(/^fill /i, '');
            improvedDescription = `Successfully filled "${fieldName}" field (validated selector: ${improvedTarget})`;
          } else if (step.action === 'expect') {
            improvedDescription = `Successfully verified element exists (validated selector: ${improvedTarget})`;
          }
        } else {
          logger.warn(`Step execution failed: ${executionResult.error}`);
          // Keep original description if execution fails
          improvedDescription = step.description;
        }
        
      } else if (step.action === 'wait') {
        // For wait actions, validate the target element exists
        if (step.target !== '#body') {
          logger.info(`Validating wait target: ${step.target}`);
          const validationResult = await this.mcpClient.validateSelector(step.target);
          
          if (validationResult.success && validationResult.improvedSelector) {
            improvedTarget = validationResult.improvedSelector;
          }
        }
        
        // Execute the wait
        const result = await this.mcpClient.executeStep('wait', improvedTarget, step.data);
        if (result.success) {
          improvedDescription = `Successfully waited for element (validated selector: ${improvedTarget})`;
        }
      } else if (step.action === 'type') {
        // For type actions, validate selector and execute
        const validationResult = await this.mcpClient.validateSelector(step.target);
        
        if (validationResult.success && validationResult.improvedSelector) {
          improvedTarget = validationResult.improvedSelector;
        }
        
        const result = await this.mcpClient.executeStep('type', improvedTarget, step.data);
        if (result.success) {
          improvedDescription = `Successfully typed text (validated selector: ${improvedTarget})`;
        }
      }
      
    } catch (error) {
      logger.warn(`MCP execution failed for step: ${step.action} on ${step.target}`, error);
      // Keep original step if MCP execution fails
      improvedTarget = step.target;
      improvedDescription = step.description;
    }
    
    return {
      ...step,
      target: improvedTarget,
      description: improvedDescription
    };
  }

  private async generateGeminiScenarios(input: PRDIntake): Promise<TestScenario[]> {
    logger.info(`Generating scenarios using Gemini ${config.gemini.model} for objective: ${input.objective}`);
    
    try {
      // Call Gemini API to generate scenarios
      const geminiResponse = await this.geminiService.generateTestScenarios(
        input.objective,
        input.url,
        input.credentials
      );
      
      logger.info('Received response from Gemini API');
      
      // Parse the Gemini response
      const parsedResponse = await this.geminiService.parseGeminiResponse(geminiResponse);
      
      if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      // Convert Gemini response to TestScenario format
      const scenarios: TestScenario[] = parsedResponse.scenarios.map((scenario: any, index: number) => ({
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
      
      logger.info(`Generated ${scenarios.length} scenarios from Gemini API`);
      
      // Return scenarios as-is, no minimum requirement
      return scenarios;
      
    } catch (error) {
      logger.error('Error generating scenarios with Gemini API:', error);
      
      // Return empty array if Gemini fails - no fallback
      return [];
    }
  }
}

// Export GeminiService from gemini-service
export { GeminiService } from './gemini-service';

// Export config from config
export { config } from './config';

// Export logger for use in other packages
export { logger } from './logger';
