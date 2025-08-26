# 🚀 TaaS_1 - Unified Test Automation & Flakiness Detection

A **unified, full-featured web application** that seamlessly combines **AI-powered test generation** with **comprehensive test execution and flakiness analysis**. This project merges the best of both worlds: SL12's intelligent test scenario generation and SL-4-main 2's advanced flakiness detection toolkit.

## 🏗️ **Project Architecture**

```
taasmerged/
├── 📁 packages/
│   ├── contracts/          # Shared JSON Schemas & Type Definitions
│   ├── compiler-core/      # Core LLM compiler & MCP integration logic
│   ├── ir/                 # Intermediate Representation types
│   ├── backend/            # Express.js server for DEFLAKE
│   └── deflake/            # Core testing framework with flakiness detection
│       ├── tests/          # Test files (where .spec.ts will be saved)
│       ├── src/            # Core DEFLAKE source code
│       ├── reports/        # Flakiness reports
│       └── test-results/   # Test execution results
├── 📁 apps/
│   ├── console-ui/         # Modern React frontend with unified workflow
│   └── combined-api/       # Unified API server (Gemini + Playwright)
├── 📁 results/             # Auto-saved JSON files and .spec.ts files
├── 📁 config/              # Environment and configuration files
├── package.json            # Workspace root configuration
├── pnpm-workspace.yaml     # PNPM workspace configuration
├── tsconfig.json           # Root TypeScript configuration
├── .gitignore              # Git ignore patterns
└── README.md               # This file
```

## ✨ **Key Features**

### 🔄 **Complete End-to-End Workflow**
1. **Generate Test Scenarios**: Use natural language with Gemini AI to create test scenarios
2. **Automatic Compilation**: Scenarios are compiled to executable Playwright TypeScript tests
3. **Dual File Saving**: .spec.ts files saved to both `results/` and `packages/deflake/tests/`
4. **Automatic Test Execution**: DEFLAKE automatically detects new test files and executes them
5. **Comprehensive Analysis**: Full flakiness detection, multi-browser testing, and detailed reporting

### 🎯 **AI-Powered Test Generation (SL12)**
- **Natural Language Input**: Describe test objectives in plain English
- **Gemini AI Integration**: Latest AI models for intelligent test scenario creation
- **Smart Scenario Creation**: Generates realistic, structured test scenarios
- **Restricted Actions**: Only 4 core actions: `goto`, `fill`, `click`, `expect`
- **Automatic Validation**: JSON schema validation and action validation
- **Real-time Compilation**: Instant Playwright TypeScript code generation

### ⚡ **Professional Test Execution (DEFLAKE)**
- **Multi-browser Support**: Chromium, Firefox, and WebKit
- **Advanced Flakiness Detection**: Pattern recognition and root cause analysis
- **Smart Retry Logic**: Configurable retry mechanisms with intelligent backoff
- **Comprehensive Reporting**: Dynamic flakiness reports, media gallery, and export capabilities
- **Interactive Web Interface**: Real-time monitoring with WebSocket communication
- **Web-based Test Selector**: Beautiful interface for test execution and analysis

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PNPM (recommended) or npm
- Gemini API key

### **Installation**

```bash
# Navigate to the project directory
cd taasmerged

# Install all dependencies
pnpm install

# Set up environment variables
cp config/config.env.example config/config.env
# Edit config/config.env with your Gemini API key

# Build all packages
pnpm build
```

### **Running the Application**

```bash
# Start all services simultaneously
pnpm dev

# The application will be available at:
# 🌐 Frontend UI: http://localhost:3000
# 🔌 Backend API: http://localhost:3002
# 🧪 DEFLAKE Backend: http://localhost:3003
# 🧪 DEFLAKE Web Interface: http://localhost:3001
```

## 📖 **Usage Guide**

### **Complete Workflow**

1. **Open the Web Interface**: Navigate to http://localhost:3000
2. **Generate Test Scenarios**: Click "🚀 Generate Scenarios & Compile to Playwright"
3. **AI Generation**: Describe your test requirements in natural language
4. **Automatic Compilation**: Scenarios are compiled to Playwright TypeScript tests
5. **Dual File Saving**: Files are saved to both `results/` and `packages/deflake/tests/`
6. **Open DEFLAKE Analysis**: Click "🚀 Open DEFLAKE Analysis Dashboard"
7. **Execute and Analyze**: Run tests and view comprehensive flakiness reports

### **File Locations**
- **Generated Scenarios**: `results/` folder (JSON format)
- **Compiled Tests**: `packages/deflake/tests/` folder (.spec.ts format)
- **Test Results**: `packages/deflake/test-results/` folder
- **Flakiness Reports**: `packages/deflake/reports/` folder

### **Example Test Generation**

**Input Prompt**: "Test user login and search functionality on Amazon website"

**Generated Actions**:
- `goto`: Navigate to Amazon login page
- `fill`: Enter username and password
- `click`: Submit login form
- `expect`: Verify successful login

**Output**: Fully executable Playwright TypeScript test file

## 🔧 **Technology Stack**

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Fastify (SL12) + Express.js (DEFLAKE)
- **AI Integration**: Google Gemini API
- **Testing Framework**: Playwright with custom DEFLAKE extensions
- **Package Manager**: PNPM with workspace support
- **Build Tools**: TypeScript compiler + Vite
- **Real-time Communication**: WebSocket for live updates

## 📊 **Port Configuration**

- **Port 3000**: SL12 React frontend (console-ui)
- **Port 3002**: SL12 Fastify API (combined-api)
- **Port 3003**: DEFLAKE Express backend (backend)
- **Port 3001**: DEFLAKE Web Interface (web-test-selector)

## 🎯 **Integration Benefits**

1. **Seamless Workflow**: From test generation to execution in one interface
2. **No Functionality Loss**: Both projects maintain 100% of their features
3. **Unified Project**: One repository, one build system, one deployment
4. **Dual Output**: Files saved to both locations for maximum compatibility
5. **Automatic Execution**: No manual intervention needed between generation and testing
6. **Real-time Analysis**: Live progress tracking and comprehensive reporting

## 🔄 **API Endpoints**

### **SL12 API (Port 3002)**
- `POST /api/v1/generate` - Generate test scenarios and compile to Playwright
- `GET /api/v1/results` - List all generated files
- `GET /health` - Health check

### **DEFLAKE Web Interface (Port 3001)**
- `GET /` - Web-based test selector interface
- `POST /api/execute-tests` - Execute Playwright tests
- `GET /api/execution-status` - Monitor test execution
- `POST /api/generate-report` - Generate flakiness reports

## 🎨 **User Interface Features**

### **SL12 Frontend**
- **Modern Design**: Full-width, responsive React interface
- **Smart Workflow**: One button handles generation and compilation
- **Loading States**: Real-time progress indicators
- **Results Display**: Comprehensive compilation results with file locations
- **DEFLAKE Integration**: Direct navigation to analysis dashboard

### **DEFLAKE Web Interface**
- **Interactive Selection**: Click-based test selection
- **Real-time Monitoring**: Live progress tracking and log streaming
- **Multi-browser Support**: Chromium, Firefox, and WebKit execution
- **Comprehensive Reports**: Flakiness analysis and performance metrics
- **Media Gallery**: Screenshots and videos for failed tests

## 🚨 **Error Handling & Validation**

### **Action Validation**
- **Restricted Actions**: Only `goto`, `fill`, `click`, `expect` allowed
- **Automatic Validation**: Server-side validation ensures compliance
- **Clear Error Messages**: Detailed feedback for validation failures

### **File Management**
- **Automatic Directory Creation**: Ensures all required directories exist
- **Dual File Saving**: Automatic backup to both locations
- **Error Recovery**: Graceful handling of file system errors

## 🔒 **Security & Configuration**

### **Environment Variables**
```bash
# Gemini AI Configuration
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# MCP Configuration
MCP_ENABLED=true

# API Configuration
PORT=3002
```

### **Access Control**
- **Local Development**: All services run on localhost
- **CORS Configuration**: Proper cross-origin resource sharing
- **Input Validation**: All user inputs are validated and sanitized

## 🚀 **Development & Deployment**

### **Development Mode**
```bash
# Start all services in development mode
pnpm dev

# Start individual services
pnpm --filter combined-api dev
pnpm --filter console-ui dev
pnpm --filter backend dev
pnpm --filter deflake web:start
```

### **Building for Production**
```bash
# Build all packages
pnpm build

# Start production services
pnpm --filter combined-api start
pnpm --filter backend start
```

### **Package Management**
```bash
# Add dependencies to specific packages
pnpm --filter combined-api add package-name
pnpm --filter console-ui add package-name

# Add workspace dependencies
pnpm add -w package-name
```

## 🤝 **Contributing**

This project combines two sophisticated testing frameworks. When contributing:
- Maintain the separation of concerns between SL12 and DEFLAKE
- Ensure new features work with both systems
- Test the complete workflow from generation to execution
- Follow TypeScript best practices
- Include proper error handling and validation

## 📚 **Troubleshooting**

### **Common Issues**

1. **Port Conflicts**: Ensure ports 3000, 3001, 3002, and 3003 are available
2. **Missing Dependencies**: Run `pnpm install` to install all packages
3. **Environment Variables**: Verify `config/config.env` is properly configured
4. **Build Errors**: Run `pnpm build` to check for compilation issues

### **Getting Help**
- Check the browser console for frontend errors
- Monitor terminal output for backend errors
- Verify all services are running on their designated ports
- Check file permissions for the results and tests directories

## 📄 **License**

This project combines functionality from multiple sources. Please refer to individual package licenses for specific terms.

## 🎉 **Conclusion**

TaaS Merged provides a complete, unified solution for modern test automation:
- **AI-Powered Generation**: Intelligent test scenario creation
- **Professional Compilation**: Production-ready Playwright tests
- **Advanced Analysis**: Comprehensive flakiness detection and reporting
- **Seamless Integration**: End-to-end workflow in one application

Built with modern web technologies and designed for scalability, this project represents the future of intelligent test automation. 🚀✨
