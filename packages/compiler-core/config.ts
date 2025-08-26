export interface AppConfig {
  gemini: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  mcp: {
    enabled: boolean;
    externalServer: boolean;
  };
}

export const config: AppConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDbuGpVxodEovGtXhUJ5bi6BrGRPf_HStQ',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
  },
  mcp: {
    enabled: process.env.MCP_ENABLED !== 'false',
    externalServer: true // We're using Cursor's built-in MCP server
  }
};
