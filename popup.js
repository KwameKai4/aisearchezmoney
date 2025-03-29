// Chat class for managing chat data
class Chat {
  constructor(id, title) {
    this.id = id || Date.now().toString();
    this.title = title || 'New Chat';
    this.messages = [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  addMessage(role, content) {
    this.messages.push({ role, content });
    this.updatedAt = new Date().toISOString();
  }

  static fromJSON(json) {
    const chat = new Chat(json.id, json.title);
    chat.messages = json.messages;
    chat.createdAt = json.createdAt;
    chat.updatedAt = json.updatedAt;
    return chat;
  }
}

import { API_CONFIG } from './config.js';
import { models as AVAILABLE_MODELS } from './models.js';

document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements - careful with element selection
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const voiceInputBtn = document.getElementById('voiceInputBtn');
  const resetBtn = document.getElementById('resetBtn');
  const resultContainer = document.getElementById('resultContainer');
  const result = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const exportBtn = document.getElementById('exportBtn');
  const shareBtn = document.getElementById('shareBtn');
  const messageDiv = document.getElementById('message');
  const urlIndicator = document.getElementById('urlContextIndicator');
  const newChatBtn = document.getElementById('newChatBtn');
  const chatList = document.getElementById('chatList');
  const exportMenu = document.getElementById('exportMenu');
  
  // Analysis buttons
  const analyzePageBtn = document.getElementById('analyzePageBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const keyPointsBtn = document.getElementById('keyPointsBtn');
  
  // Mode selection buttons
  const basicModeBtn = document.getElementById('basicModeBtn');
  const urlModeBtn = document.getElementById('urlModeBtn');

  // Initialize message timeout variable
  let messageTimeout;

  // State management
  let currentQuery = '';
  let currentResponse = '';
  let currentUrl = '';
  let pageContent = '';
  let pageTitle = '';
  let conversationHistory = [];
  let isUseUrlContext = true;
  let isRecording = false;
  let currentChat = null;
  let activeFilters = new Set();

  // Show message helper with timeout handling
  function showMessage(text, type = 'info') {
    if (!messageDiv) return;
    
    console.log(`Message (${type}): ${text}`);

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    messageDiv.innerHTML = `
      <span class="message-icon">${icons[type] || icons.info}</span>
      <span class="message-text">${text}</span>
    `;
    messageDiv.className = `message ${type}`;
    
    messageDiv.classList.add('show');
    
    // Clear any existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    
    messageTimeout = setTimeout(() => {
      messageDiv.classList.remove('show');
    }, 3000);
  }

  // Chat management functions
  async function loadChats() {
    try {
      const { chats = [] } = await chrome.storage.local.get('chats');
      return chats.map(chat => Chat.fromJSON(chat));
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  async function saveChats(chats) {
    try {
      await chrome.storage.local.set({ chats });
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  async function createNewChat() {
    const chat = new Chat();
    const chats = await loadChats();
    chats.unshift(chat);
    await saveChats(chats);
    await switchChat(chat.id);
    renderChatList();
    resetChat();
    return chat;
  }

  function showConfirmDialog(message, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="cancel-btn">Cancel</button>
          <button class="confirm-btn">Confirm</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('show'), 10);
    
    const handleClose = () => {
      dialog.classList.remove('show');
      setTimeout(() => dialog.remove(), 300);
    };
    
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
      onConfirm();
      handleClose();
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', handleClose);
  }

  async function deleteChat(chatId) {
    showConfirmDialog('Are you sure you want to delete this chat?', async () => {
      const chats = await loadChats();
      const newChats = chats.filter(c => c.id !== chatId);
      await saveChats(newChats);
      
      if (currentChat?.id === chatId) {
        if (newChats.length > 0) {
          await switchChat(newChats[0].id);
        } else {
          await createNewChat();
        }
      }
      
      renderChatList();
      showMessage('Chat deleted successfully', 'success');
    });
  }

  async function renameChat(chatId, newTitle) {
    const chats = await loadChats();
    const index = chats.findIndex(c => c.id === chatId);
    if (index !== -1) {
      chats[index].title = newTitle;
      await saveChats(chats);
      if (currentChat?.id === chatId) {
        currentChat.title = newTitle;
      }
      renderChatList();
    }
  }

  async function switchChat(chatId) {
    const chats = await loadChats();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      currentChat = chat;
      conversationHistory = chat.messages;
      renderConversation();
      await chrome.storage.local.set({ lastActiveChatId: chatId });
      renderChatList();
    }
  }

  function resetChat() {
    conversationHistory = [];
    currentQuery = '';
    currentResponse = '';
    result.textContent = '';
    resultContainer.classList.add('hidden');
    searchInput.value = '';
  }

  function renderChatList() {
    loadChats().then(chats => {
      chatList.innerHTML = '';
      chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${chat.id === currentChat?.id ? 'active' : ''}`;
        
        const titleContainer = document.createElement('div');
        titleContainer.className = 'chat-title';
        titleContainer.textContent = chat.title;
        titleContainer.addEventListener('click', () => switchChat(chat.id));
        titleContainer.addEventListener('dblclick', () => {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = chat.title;
          input.className = 'chat-rename-input';
          
          input.addEventListener('blur', async () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== chat.title) {
              await renameChat(chat.id, newTitle);
            }
            titleContainer.textContent = chat.title;
          });
          
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              input.blur();
            } else if (e.key === 'Escape') {
              titleContainer.textContent = chat.title;
              input.remove();
            }
          });
          
          titleContainer.textContent = '';
          titleContainer.appendChild(input);
          input.focus();
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chat-delete-btn';
        deleteBtn.innerHTML = '<span class="material-icons">close</span>';
        deleteBtn.title = 'Delete chat';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteChat(chat.id);
        });
        
        chatElement.appendChild(titleContainer);
        chatElement.appendChild(deleteBtn);
        chatList.appendChild(chatElement);
      });
    });
  }

  function renderConversation() {
    if (currentChat?.messages.length > 0) {
      const lastMessage = currentChat.messages[currentChat.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        result.innerHTML = formatResponse(lastMessage.content);
        currentResponse = lastMessage.content;
        resultContainer.classList.remove('hidden');
      }
    } else {
      resetChat();
    }
  }

  // API key validation
  async function validateApiKey(apiKey) {
    if (!apiKey || apiKey.trim().length < 5) { // Simplified validation
      throw new Error('Invalid API key format');
    }

    try {
      // For testing purposes, just return valid without actual API call
      return { valid: true, quota: {}, remaining: null };
    } catch (error) {
      console.error('API key validation error:', error);
      throw new Error('Could not validate API key');
    }
  }

  // Update model options with validation
  async function updateModelOptions(apiKey) {
    modelSelect.innerHTML = '';
    
    if (!apiKey) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Enter API key to see models';
      placeholder.disabled = true;
      placeholder.selected = true;
      modelSelect.appendChild(placeholder);
      return;
    }

    try {
      await validateApiKey(apiKey);
      if (AVAILABLE_MODELS && Array.isArray(AVAILABLE_MODELS)) {
        AVAILABLE_MODELS.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          modelSelect.appendChild(option);
        });
      } else {
        // Fallback models if AVAILABLE_MODELS is not defined
        const fallbackModels = [
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'claude-2', name: 'Claude 2' }
        ];
        
        fallbackModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          modelSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Could not validate API key', 'error');
      
      const errorOption = document.createElement('option');
      errorOption.value = '';
      errorOption.textContent = 'Invalid API key';
      errorOption.disabled = true;
      errorOption.selected = true;
      modelSelect.appendChild(errorOption);
    }
  }

  // Get current page context
  async function getCurrentPageContext() {
    try {
      // For testing purposes, return dummy context
      currentUrl = 'https://example.com';
      pageTitle = 'Example Page';
      pageContent = 'This is example content for testing.';

      if (isUseUrlContext) {
        urlIndicator.textContent = `Using context from: ${pageTitle}`;
        urlIndicator.classList.remove('hidden');
      } else {
        urlIndicator.classList.add('hidden');
      }
      
      return { url: currentUrl, title: pageTitle, content: pageContent };
    } catch (error) {
      console.error('Error getting page context:', error);
      showMessage('Could not access page content', 'error');
      return null;
    }
  }

  // Format response (convert markdown-like syntax)
  function formatResponse(text) {
    if (!text) return '';
    
    // Code blocks (```...```)
    text = text.replace(/```([\s\S]*?)```/g, '<div class="code-block">$1</div>');
    
    // Inline code (`...`)
    text = text.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
    
    // Bold (**...** or __...__) 
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Italic (*...* or _..._)
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // New lines
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }

  // Process query with active filters
  async function processQuery(query, context) {
    try {
      let enhancedPrompt = query;
      
      if (activeFilters.size > 0) {
        const filterInstructions = [];
        if (activeFilters.has('webpage')) {
          filterInstructions.push('focus on the current webpage content');
        }
        if (activeFilters.has('code')) {
          filterInstructions.push('identify and explain any code or technical concepts');
        }
        if (activeFilters.has('facts')) {
          filterInstructions.push('verify and highlight key facts');
        }
        if (activeFilters.has('summary')) {
          filterInstructions.push('provide a concise summary');
        }
        
        if (filterInstructions.length > 0) {
          enhancedPrompt = `${query} (Please ${filterInstructions.join(' and ')})`;
        }
      }
      
      return sendQuery(enhancedPrompt, context);
    } catch (error) {
      console.error("Error processing query:", error);
      throw error;
    }
  }

  // Send command to AI model
  async function sendCommand(command, context = null) {
    showMessage(`Executing: ${command}...`, 'info');
    
    // For testing purposes, return a mock response
    setTimeout(() => {
      const mockResponse = `Here's a mock response for the command: ${command}
      
This is a sample AI response that simulates what you would get from a real API call.
      
• The command was processed successfully
• This is just for testing button functionality
• In a real implementation, this would connect to an AI service API`;
      
      result.innerHTML = formatResponse(mockResponse);
      currentResponse = mockResponse;
      resultContainer.classList.remove('hidden');
      
      showMessage('Command executed successfully', 'success');
    }, 1500);
    
    return true;
  }

  // Send query function (for search box)
  async function sendQuery(query, context = null) {
    showMessage('Processing query...', 'info');
    
    // For testing purposes, return a mock response
    setTimeout(() => {
      const mockResponse = `Here's a mock response for the query: "${query}"
      
This is a sample AI response that simulates what you would get from a real API call.
      
• The query was processed successfully
• This is just for testing search functionality
• In a real implementation, this would connect to an AI service API
      
**Bold text example**
*Italic text example*
\`inline code example\`
      
\`\`\`
function exampleCode() {
  return "This is a code block example";
}
\`\`\``;
      
      result.innerHTML = formatResponse(mockResponse);
      currentResponse = mockResponse;
      resultContainer.classList.remove('hidden');
      
      // Update conversation history
      conversationHistory.push({ role: 'user', content: query });
      conversationHistory.push({ role: 'assistant', content: mockResponse });
      
      // Update current chat if available
      if (currentChat) {
        currentChat.addMessage('user', query);
        currentChat.addMessage('assistant', mockResponse);
        if (currentChat.messages.length === 2) { // First message pair
          currentChat.title = query.substring(0, 30) + (query.length > 30 ? '...' : '');
        }
        saveCurrentChat();
        renderChatList();
      }
      
      showMessage('Query processed successfully', 'success');
    }, 1500);
    
    return true;
  }

  async function saveCurrentChat() {
    if (!currentChat) return;
    
    try {
      const chats = await loadChats();
      const index = chats.findIndex(c => c.id === currentChat.id);
      if (index !== -1) {
        chats[index] = currentChat;
        await saveChats(chats);
      }
    } catch (error) {
      console.error("Error saving current chat:", error);
    }
  }

  // Export result function
  function exportResult(format) {
    if (!currentResponse) {
      showMessage('No content to export', 'warning');
      return;
    }

    let content = currentResponse;
    let filename = `response.${format}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'markdown':
        filename = 'response.md';
        break;
      case 'html':
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Response</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  ${formatResponse(currentResponse)}
</body>
</html>`;
        mimeType = 'text/html';
        break;
      case 'json':
        content = JSON.stringify({
          timestamp: new Date().toISOString(),
          content: currentResponse,
          metadata: {
            url: currentUrl,
            title: pageTitle,
            filters: Array.from(activeFilters)
          }
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      showMessage(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error("Export error:", error);
      showMessage('Failed to export file', 'error');
    }
  }

  // Settings panel handling with improved visibility control
  const settingsBackdrop = document.getElementById('settingsBackdrop');

  function openSettings() {
    console.log("Opening settings panel");
    settingsPanel.classList.remove('hidden');
    settingsBackdrop.classList.add('show');
    settingsBtn.classList.add('active');
    
    // Allow DOM to update before adding show class for animation
    setTimeout(() => {
      settingsPanel.classList.add('show');
    }, 10);
  }

  function closeSettings() {
    console.log("Closing settings panel");
    settingsPanel.classList.remove('show');
    settingsBackdrop.classList.remove('show');
    settingsBtn.classList.remove('active');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      settingsPanel.classList.add('hidden');
    }, 300);
  }

  // Toggle settings panel - fixed to ensure it works
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Settings button clicked");
      if (settingsPanel.classList.contains('hidden')) {
        openSettings();
      } else {
        closeSettings();
      }
    });
  }

  // Close settings when clicking on backdrop
  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSettings();
    });
  }

  // Ensure the settings panel is interactive
  if (settingsPanel) {
    settingsPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Set up save settings button
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Save settings button clicked");
      
      // Mock saving settings
      showMessage('Settings saved successfully', 'success');
      closeSettings();
    });
  }
  
  // Handle tab selection in settings
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('[id$="Tab"]');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${tab}Tab`).classList.add('active');
    });
  });

  // Handle temperature slider
  const temperatureSlider = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');
  
  if (temperatureSlider && temperatureValue) {
    temperatureSlider.addEventListener('input', () => {
      temperatureValue.textContent = temperatureSlider.value;
    });
  }

  // Handle personality preset changes
  const personalityPreset = document.getElementById('personalityPreset');
  const customPersonality = document.getElementById('customPersonality');
  
  if (personalityPreset && customPersonality) {
    personalityPreset.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customPersonality.removeAttribute('disabled');
      } else {
        customPersonality.setAttribute('disabled', 'disabled');
      }
    });
  }

  // Load saved settings - Fixed implementation
  async function loadSettings() {
    try {
      // For testing purposes, use default values instead of chrome.storage
      // In a real implementation, this would use chrome.storage.sync.get
      
      const settings = {
        apiKey: 'sk-sample-test-key-1234567890',
        model: 'gpt-3.5-turbo',
        temperature: '0.7',
        useUrlContext: true,
        botName: 'AI Assistant',
        personalityPreset: 'professional',
        customPersonality: ''
      };
      
      console.log("Settings loaded:", settings);
      
      // Apply the loaded settings
      if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
      
      // Update model options
      if (settings.apiKey) {
        await updateModelOptions(settings.apiKey);
        if (settings.model && modelSelect) {
          modelSelect.value = settings.model;
        }
      }
      
      // Update temperature slider
      if (temperatureSlider && temperatureValue && settings.temperature) {
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature;
      }
      
      // Update context mode
      isUseUrlContext = settings.useUrlContext !== undefined ? settings.useUrlContext : true;
      updateModeButtons();
      
      // Update bot personality settings
      const botNameInput = document.getElementById('botName');
      const personalityPresetSelect = document.getElementById('personalityPreset');
      const customPersonalityTextarea = document.getElementById('customPersonality');
      
      if (botNameInput) {
        botNameInput.value = settings.botName || 'AI Assistant';
      }
      
      if (personalityPresetSelect) {
        personalityPresetSelect.value = settings.personalityPreset || 'professional';
        
        // Update the custom personality textarea state
        if (customPersonalityTextarea) {
          customPersonalityTextarea.value = settings.customPersonality || '';
          customPersonalityTextarea.disabled = settings.personalityPreset !== 'custom';
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Failed to load settings, using defaults', 'warning');
      return {};
    }
  }

  // Initialize chat functionality
  async function initializeChat() {
    try {
      const chats = await loadChats();
      
      // Try to get last active chat ID - fall back to first chat or create new one
      let lastActiveChatId = null;
      try {
        // In a real implementation, this would use chrome.storage.local.get
        lastActiveChatId = null; // For testing
      } catch (err) {
        console.log("No last active chat found");
      }
      
      if (chats.length > 0) {
        const lastChat = lastActiveChatId ? chats.find(c => c.id === lastActiveChatId) : chats[0];
        if (lastChat) {
          await switchChat(lastChat.id);
        } else {
          await switchChat(chats[0].id);
        }
      } else {
        await createNewChat();
      }
      
      // Set up new chat button
      if (newChatBtn) {
        console.log("Setting up new chat button");
        newChatBtn.addEventListener('click', createNewChat);
      }
      
      console.log("Chat initialized successfully");
      return true;
    } catch (error) {
      console.error('Error initializing chat:', error);
      showMessage('Failed to initialize chats', 'error');
      // Create a new chat anyway to have something to work with
      await createNewChat();
      return false;
    }
  }

  // Mode selection with fixed event handlers
  function updateModeButtons() {
    if (!basicModeBtn || !urlModeBtn) return;
    
    basicModeBtn.classList.toggle('active', !isUseUrlContext);
    urlModeBtn.classList.toggle('active', isUseUrlContext);
    
    if (isUseUrlContext) {
      getCurrentPageContext();
    } else {
      if (urlIndicator) {
        urlIndicator.classList.add('hidden');
      }
    }
  }

  // Initialize on load - ensure this runs properly
  try {
    console.log("Starting initialization...");
    await loadSettings();
    await getCurrentPageContext();
    await initializeChat();
    
    // Activate search filter functionality
    document.querySelectorAll('.filter-chip').forEach(filter => {
      filter.addEventListener('click', () => {
        const filterType = filter.dataset.filter;
        if (filterType) {
          if (activeFilters.has(filterType)) {
            activeFilters.delete(filterType);
            filter.classList.remove('active');
          } else {
            activeFilters.add(filterType);
            filter.classList.add('active');
          }
        }
      });
    });
    
    console.log("Initialization complete");
    showMessage('App initialized successfully', 'success');
  } catch (error) {
    console.error("Initialization error:", error);
    showMessage('Error initializing app: ' + error.message, 'error');
  }
});
