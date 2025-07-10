# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Finance Wizard is an interactive CLI tool that connects to YNAB (You Need A Budget) to provide AI-powered financial insights using Claude Sonnet 4.0. The application analyzes transaction data to identify spending patterns, savings opportunities, and provides personalized financial advice.

## Development Commands

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run linting
npm run lint

# Type checking
npm run typecheck

# Start the application (after building)
npm start chat
```

## Application Commands

```bash
# Interactive chat mode with AI financial advisor
npm start chat [-m <months>]

# Sync fresh data from YNAB
npm start sync

# Run analysis on cached data
npm start analyze [-m <months>]

# Manage budget selection
npm start budget [--select|--view|--clear]

# Manage user context for personalized advice
npm start context [--setup|--view|--clear]
```

## Architecture

### Core Components

- **CLI Entry Point** (`src/index.ts`): Commander.js-based CLI with 5 main commands
- **YNAB Client** (`src/ynab/client.ts`): Handles YNAB API integration, caching, and budget management
- **Finance Analyzer** (`src/analysis/analyzer.ts`): Processes transaction data to generate insights
- **AI Chat** (`src/ai/chat.ts`): Anthropic API integration with tool calling capabilities
- **Interactive Mode** (`src/cli/interactive.ts`): Main chat interface with tool execution

### Key Patterns

1. **Tool-based AI Architecture**: AI can execute tools (sync, analyze, generate reports) based on user requests
2. **Caching Strategy**: Transaction data cached locally with configurable duration (default 24h)
3. **Context Management**: User personal context stored for personalized AI advice
4. **Multi-budget Support**: Can switch between different YNAB budgets

### Data Flow

1. User starts chat mode → loads cached data or prompts to sync
2. AI receives user message + financial context (insights, recent transactions)
3. AI can call tools to sync data, clear cache, analyze transactions, or generate reports
4. Tools executed via `ToolExecutor` class, results fed back to AI
5. AI provides personalized advice based on user context and fresh data

### Environment Configuration

Required environment variables:
- `YNAB_ACCESS_TOKEN`: YNAB Personal Access Token
- `ANTHROPIC_API_KEY`: Anthropic API key

Optional:
- `CACHE_DURATION_HOURS`: Cache duration (default: 24)
- `DEFAULT_ANALYSIS_MONTHS`: Analysis period (default: 3)

### Testing

No formal test suite currently exists. Manual testing involves:
1. Verifying YNAB API connection
2. Testing AI tool execution
3. Validating data analysis accuracy
4. Confirming cache behavior

## TypeScript Configuration

- Target: ES2020
- Strict mode enabled
- Output: `dist/` directory
- Source maps and declarations generated

## Key Files to Understand

- `src/types/analysis.ts`: Core data structures for financial analysis
- `src/types/tools.ts`: Available AI tools and their schemas
- `src/utils/config.ts`: Configuration loading and validation
- `src/utils/context.ts`: User context management for personalized advice
- `src/utils/tool-executor.ts`: Tool execution logic