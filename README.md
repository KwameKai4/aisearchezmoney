# AI Search Assistant Chrome Extension

A Chrome extension that provides AI-powered search and analysis capabilities with URL context support, subscription management, and usage tracking.

## Features

- AI-powered search with GPT and other language models
- URL context support for page-specific queries
- Voice input and text-to-speech output
- Premium subscription management
- Usage tracking and rate limiting
- Multiple model support (free and paid options)
- ElevenLabs integration for high-quality TTS

## Setup Instructions

### Prerequisites

1. Node.js (v14 or higher)
2. Chrome browser
3. Supabase account
4. Stripe account (for payments)
5. OpenRouter API key
6. ElevenLabs API key (optional)

### Environment Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-search-assistant.git
cd ai-search-assistant
```

2. Install dependencies
```bash
npm install
```

3. Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```plaintext
# Supabase Configuration
SUPABASE_URL="your-supabase-project-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"

# Stripe Configuration
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
STRIPE_PRICE_ID_PRO="your-stripe-price-id"

# OAuth Configuration
OAUTH_CLIENT_ID="your-oauth-client-id"
OAUTH_CLIENT_SECRET="your-oauth-client-secret"
```

Note: OpenRouter and ElevenLabs API keys are managed through the extension's settings panel and stored securely in the browser's storage, not in environment variables.

### Database Setup

1. Create a new Supabase project

2. Run the database schema:
   - Navigate to the SQL editor in your Supabase dashboard
   - Copy the contents of `schema.sql`
   - Run the SQL commands to create tables and functions

3. Configure Row Level Security (RLS):
   - The schema includes RLS policies
   - Verify policies are active in Supabase dashboard

### Stripe Setup

1. Create a Stripe account and get your API keys

2. Create subscription products:
   - Create a "Pro" subscription product
   - Set up pricing and features
   - Copy the price ID to your `.env` file

3. Configure webhooks:
   - Set up webhook endpoint in Stripe dashboard
   - Add webhook secret to `.env`

### Extension Installation

1. Build the extension:
```bash
npm run build
```

2. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Usage

1. Click the extension icon to open the popup
2. Choose between basic query or URL context mode
3. Enter your question or use voice input
4. View results and use available actions:
   - Copy response
   - Download as text
   - Text-to-speech playback
   - Share results

## Development

### Running locally

1. Start development server:
```bash
npm run dev
```

2. Make changes to source files
3. Extension will automatically reload

### Testing

```bash
npm test
```

### Building for production

```bash
npm run build
```

## Security

- All API keys are stored securely
- Environment variables are not exposed to client
- Row Level Security ensures data privacy
- Rate limiting prevents abuse

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Support

For support, email support@example.com or create an issue in the repository.
