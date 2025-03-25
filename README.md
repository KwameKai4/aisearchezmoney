# AI Assistant Browser Extension

A powerful Chrome extension that integrates AI capabilities directly into your browsing experience. Analyze pages, get summaries, and chat with an AI assistant about any web content.

## Features

### Core Functionality
- **Context-Aware Chat**: Chat with AI about the current webpage or in basic mode
- **Page Analysis**: Analyze webpages with a single click
- **Quick Actions**: 
  - Analyze: Detailed analysis of page content
  - Summarize: Quick page summaries
  - Key Points: Extract main points from articles
- **Voice Input**: Speak your questions directly

### Advanced Features
- **Customizable AI Personality**:
  - Choose from preset personalities (Professional, Friendly, Technical)
  - Create custom personality descriptions
  - Set custom bot name
- **Conversation Management**:
  - Save and manage chat history
  - Rename conversations
  - Easy chat navigation
- **Result Actions**:
  - Copy to clipboard
  - Download responses
  - Share functionality
  - Reset conversations

### Settings & Configuration
- **API Integration**:
  - OpenRouter API support
  - Multiple model selection
  - Temperature control for response creativity
- **Context Modes**:
  - URL Context: AI understands current page
  - Basic Mode: General conversation
- **UI Customization**:
  - Dark/Light mode support
  - Responsive design
  - Smooth animations

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-assistant-extension.git
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your OpenRouter API key to `.env`:
```
OPENROUTER_API_KEY=your_api_key_here
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Configuration

### API Setup
1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Enter the API key in extension settings
3. Select your preferred AI model

### Personality Settings
1. Choose a personality preset or create custom
2. Set your preferred bot name
3. Adjust temperature for response creativity

## Usage

### Basic Operations
1. Click the extension icon to open
2. Type your question or use voice input
3. Use quick action buttons for common tasks
4. View responses in the result area

### Context Modes
- **URL Mode**: AI understands current page
- **Basic Mode**: General conversation without context

### Managing Conversations
- Create new chats with the '+' button
- Rename chats by double-clicking
- Delete chats using the 'x' button
- Switch between conversations in sidebar

## Development

### Project Structure
```
├── manifest.json        # Extension configuration
├── popup.html          # Main UI
├── popup.js            # UI logic
├── content.js          # Page interaction
├── background.js       # Background processes
├── styles.css          # Styling
├── models.js           # AI model definitions
└── config.js          # Configuration
```

### Build & Test
1. Make changes to source files
2. Reload extension in Chrome
3. Test functionality
4. Check console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions:
1. Check existing issues
2. Open new issue if needed
3. Provide detailed description
4. Include steps to reproduce

## Screenshots

![Main Interface](pic1.png)
![Settings Panel](pic2.png)
![Analysis Mode](pic3.png)
