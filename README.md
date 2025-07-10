# Finance Wizard 🧙‍♂️

An interactive CLI tool that analyzes your YNAB (You Need A Budget) transactions using AI to provide personalized financial insights and savings recommendations.

## Features

- 🔗 **YNAB Integration**: Securely connects to your YNAB account to fetch transaction data
- 🤖 **AI-Powered Insights**: Uses Claude 3.5 Sonnet to analyze spending patterns and provide recommendations
- 💰 **Savings Opportunities**: Identifies potential savings through subscription analysis, spending pattern detection, and budget optimization
- 📊 **Interactive Analysis**: Chat with AI about your finances, ask questions, and get personalized advice
- 🛠️ **Tool Calling**: AI can perform actions like syncing fresh data, clearing cache, and generating reports
- 👤 **Personal Context**: Set up your family, income, and goals for personalized AI advice
- 📈 **Trend Analysis**: Visualizes spending trends and budget performance over time
- 💾 **Smart Caching**: Caches data locally for faster subsequent analyses

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys:
   - `YNAB_ACCESS_TOKEN`: Get from YNAB Account Settings > Developer Settings
   - `ANTHROPIC_API_KEY`: Get from Anthropic Console

3. **Build and run**:
   ```bash
   npm run build
   npm start chat
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Usage

### Commands

**Local Development:**
- `npm start chat` - Start interactive chat mode
- `npm start sync` - Sync fresh data from YNAB
- `npm start analyze` - Run analysis on cached data
- `npm start budget` - Manage budget selection
- `npm start context` - Manage personal context

**Global Installation (optional):**
After running `npm install -g .`, you can use:
- `finance-wizard chat`
- `finance-wizard sync` 
- etc.

### Chat Commands

Once in chat mode, you can use these commands:
- `help` - Show available commands
- `summary` - Display financial summary
- `savings` - Show savings opportunities
- `trends` - Display monthly trends
- `recommendations` - Get AI budget recommendations
- `quit` - Exit the application

### Example Questions

Ask the AI anything about your finances:
- "What are my biggest spending categories?"
- "Where can I save money this month?"
- "Are there any unusual transactions I should review?"
- "How is my spending trending compared to last month?"
- "What subscriptions am I paying for?"
- "Please re-sync the transactions, I updated categories in YNAB"
- "Generate a savings report for me"
- "Clear the cache and get fresh data"
- "Switch to my business budget"

The AI will automatically perform actions when needed, such as syncing fresh data, generating reports, or switching budgets.

## Configuration

### Budget Selection

If you have multiple YNAB budgets, Finance Wizard will prompt you to select which one to analyze on first run. You can change this anytime:

```bash
# Select a different budget
npm start budget -- --select

# View current budget
npm start budget -- --view

# Clear budget selection (will prompt again)
npm start budget -- --clear
```

### Personal Context

Set up your personal information for more tailored AI advice:

```bash
# Full interactive setup
npm start context -- --setup

# View current context
npm start context -- --view

# Clear context
npm start context -- --clear
```

### Environment Variables

- `YNAB_ACCESS_TOKEN` - Your YNAB Personal Access Token (required)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
- `CACHE_DURATION_HOURS` - How long to cache data (default: 24)
- `DEFAULT_ANALYSIS_MONTHS` - Default months to analyze (default: 3)

### Analysis Options

- Specify date ranges for analysis
- Filter by account or category
- Set minimum transaction amounts
- Choose analysis depth (3, 6, or 12 months)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## Privacy & Security

- Your financial data is processed locally and only sent to Anthropic's API for analysis
- API keys are stored in environment variables, never in code
- Transaction data is cached locally for performance
- No financial data is stored permanently or shared with third parties

## Requirements

- Node.js 18+
- YNAB account with Personal Access Token
- Anthropic API key
- npm or yarn

## Troubleshooting

**"Missing required environment variable"**
- Ensure your `.env` file is properly configured with valid API keys

**"No budgets found"**
- Verify your YNAB access token is correct and has appropriate permissions

**"Rate limit exceeded"**
- YNAB API has a 200 requests/hour limit. Wait before making more requests.

**"Error loading data"**
- Check your internet connection and API key validity
- Try running `finance-wizard sync` to refresh cached data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please create an issue on the GitHub repository.