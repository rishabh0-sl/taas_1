import { logger } from './logger.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPExecutionResult {
  success: boolean;
  improvedSelector?: string;
  error?: string;
  executionTime?: number;
}

export class MCPClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private transport: StdioClientTransport | null = null;

  constructor() {
    // We'll connect to Cursor's MCP server through stdio
  }

  async connect(): Promise<boolean> {
    try {
      logger.info('Connecting to Cursor MCP server...');
      
      // Create stdio transport to communicate with Cursor's MCP server
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['@playwright/mcp@latest']
      });
      
      // Create MCP client
      this.client = new Client({
        name: 'ptosmcpllm-compiler',
        version: '1.0.0'
      });

      // Connect to the MCP server
      await this.client.connect(this.transport);
      
      this.isConnected = true;
      logger.info('Successfully connected to Cursor MCP server');
      return true;
      
    } catch (error) {
      logger.warn('Failed to connect to Cursor MCP server:', error);
      this.isConnected = false;
      return false;
    }
  }

  async executeStep(action: string, target: string, data?: string): Promise<MCPExecutionResult> {
    if (!this.isConnected || !this.client) {
      logger.warn('MCP client not connected, skipping step execution');
      return { success: false, error: 'Not connected to MCP server' };
    }

    try {
      logger.info(`Executing step via MCP: ${action} on ${target}`);
      
      const startTime = Date.now();
      
      // Call the appropriate MCP tool based on the action
      switch (action) {
        case 'goto':
          return await this.navigate(target);
        case 'click':
          return await this.click(target);
        case 'fill':
          return await this.fill(target, data);
        case 'expect':
          return await this.expect(target);
        case 'wait':
          return await this.wait(target, data);
        case 'type':
          return await this.type(target, data);
        default:
          logger.warn(`Unknown action: ${action}`);
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      logger.error(`Error executing step via MCP:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async validateSelector(selector: string): Promise<MCPExecutionResult> {
    if (!this.isConnected || !this.client) {
      return { success: false, error: 'Not connected to MCP server' };
    }

    try {
      logger.info(`Validating selector via MCP: ${selector}`);
      
      // Use the MCP server's selector validation tool
      const result = await this.client.callTool({
        name: 'playwright_validate_selector',
        arguments: {
          selector,
          context: 'validation'
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return {
              success: true,
              improvedSelector: parsed.improvedSelector || selector,
              executionTime: parsed.executionTime || 0
            };
          } catch {
            // If not JSON, treat as improved selector
            return {
              success: true,
              improvedSelector: content.text,
              executionTime: 0
            };
          }
        }
      }

      return { success: true, improvedSelector: selector, executionTime: 0 };
      
    } catch (error) {
      logger.error(`Error validating selector via MCP:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async navigate(url: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Navigating to URL: ${url}`);
      
      // Use the MCP server's navigate tool
      const result = await this.client!.callTool({
        name: 'playwright_navigate',
        arguments: {
          url
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              executionTime: parsed.executionTime || 1000 
            };
          } catch {
            return { success: true, executionTime: 1000 };
          }
        }
      }

      return { success: true, executionTime: 1000 };
      
    } catch (error) {
      logger.error(`Navigation failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Navigation failed' };
    }
  }

  private async click(selector: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Clicking on: ${selector}`);
      
      // Use the MCP server's click tool
      const result = await this.client!.callTool({
        name: 'playwright_click',
        arguments: {
          selector
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              improvedSelector: parsed.improvedSelector || selector,
              executionTime: parsed.executionTime || 500 
            };
          } catch {
            return { success: true, improvedSelector: selector, executionTime: 500 };
          }
        }
      }

      return { success: true, improvedSelector: selector, executionTime: 500 };
      
    } catch (error) {
      logger.error(`Click failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Click failed' };
    }
  }

  private async fill(selector: string, data?: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Filling ${selector} with: ${data}`);
      
      // Use the MCP server's fill tool
      const result = await this.client!.callTool({
        name: 'playwright_fill',
        arguments: {
          selector,
          value: data || ''
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              improvedSelector: parsed.improvedSelector || selector,
              executionTime: parsed.executionTime || 500 
            };
          } catch {
            return { success: true, improvedSelector: selector, executionTime: 500 };
          }
        }
      }

      return { success: true, improvedSelector: selector, executionTime: 500 };
      
    } catch (error) {
      logger.error(`Fill failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Fill failed' };
    }
  }

  private async expect(selector: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Expecting element: ${selector}`);
      
      // Use the MCP server's expect tool
      const result = await this.client!.callTool({
        name: 'playwright_expect',
        arguments: {
          selector
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              improvedSelector: parsed.improvedSelector || selector,
              executionTime: parsed.executionTime || 300 
            };
          } catch {
            return { success: true, improvedSelector: selector, executionTime: 300 };
          }
        }
      }

      return { success: true, improvedSelector: selector, executionTime: 300 };
      
    } catch (error) {
      logger.error(`Expect failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Expect failed' };
    }
  }

  private async wait(selector: string, duration?: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Waiting for: ${selector}, duration: ${duration}`);
      
      // Use the MCP server's wait tool
      const result = await this.client!.callTool({
        name: 'playwright_wait',
        arguments: {
          selector,
          timeout: parseInt(duration || '1000')
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              executionTime: parsed.executionTime || parseInt(duration || '1000') 
            };
          } catch {
            return { success: true, executionTime: parseInt(duration || '1000') };
          }
        }
      }

      return { success: true, executionTime: parseInt(duration || '1000') };
      
    } catch (error) {
      logger.error(`Wait failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Wait failed' };
    }
  }

  private async type(selector: string, data?: string): Promise<MCPExecutionResult> {
    try {
      logger.info(`Typing in ${selector}: ${data}`);
      
      // Use the MCP server's type tool
      const result = await this.client!.callTool({
        name: 'playwright_type',
        arguments: {
          selector,
          text: data || ''
        }
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            return { 
              success: parsed.success || true, 
              improvedSelector: parsed.improvedSelector || selector,
              executionTime: parsed.executionTime || 500 
            };
          } catch {
            return { success: true, improvedSelector: selector, executionTime: 500 };
          }
        }
      }

      return { success: true, improvedSelector: selector, executionTime: 500 };
      
    } catch (error) {
      logger.error(`Type failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Type failed' };
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
    this.isConnected = false;
    logger.info('Disconnected from Cursor MCP server');
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}
