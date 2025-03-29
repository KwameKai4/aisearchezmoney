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
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        // No valid tab or on a chrome:// page which we can't access
        showMessage('Cannot access content on this page', 'warning');
        return null;
      }
      
      currentUrl = tab.url;
      pageTitle = tab.title;
      
      // Send message to content script to get page content
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      
      if (response && response.success) {
        pageContent = response.content;
        pageTitle = response.title || tab.title;
      } else {
        showMessage('Could not extract page content', 'warning');
        pageContent = '';
      }

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

  // Send query function (for search box)
  async function sendQuery(query, context = null) {
    showMessage('Processing query...', 'info');
    
    try {
      // Get API key and model from settings
      const { apiKey, model, temperature } = await chrome.storage.sync.get(['apiKey', 'model', 'temperature']);
      
      if (!apiKey) {
        showMessage('Please add your API key in settings', 'warning');
        openSettings();
        return false;
      }
      
      // Prepare messages array
      let messages = [];
      
      // Add system message if URL context is enabled
      if (isUseUrlContext && context && context.content) {
        messages.push({
          role: 'system',
          content: `You are an AI assistant analyzing web content from: ${context.url || 'unknown URL'}
Title: ${context.title || 'untitled'}
Please use this content as context for your responses. Page content:
${context.content.substring(0, 5000)}...`
        });
      }
      
      // Add conversation history for context (limit to last 10 messages)
      const historyLimit = 10;
      if (conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-historyLimit));
      }
      
      // Add the current query
      messages.push({ role: 'user', content: query });
      
      // Prepare API request
      const response = await fetch(`${API_CONFIG.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': API_CONFIG.openRouter.referer || 'https://github.com/extension'
        },
        body: JSON.stringify({
          model: model || 'open-r1/olympiccoder-7b:free',
          messages,
          temperature: parseFloat(temperature || 0.7),
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'No response received';
      
      // Update UI
      result.innerHTML = formatResponse(aiResponse);
      currentResponse = aiResponse;
      resultContainer.classList.remove('hidden');
      
      // Update conversation history
      conversationHistory.push({ role: 'user', content: query });
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      
      // Update current chat if available
      if (currentChat) {
        currentChat.addMessage('user', query);
        currentChat.addMessage('assistant', aiResponse);
        if (currentChat.messages.length === 2) { // First message pair
          currentChat.title = query.substring(0, 30) + (query.length > 30 ? '...' : '');
        }
        saveCurrentChat();
        renderChatList();
      }
      
      showMessage('Query processed successfully', 'success');
      return true;
    } catch (error) {
      console.error("API error:", error);
      showMessage(`Error: ${error.message}`, 'error');
      return false;
    }
  }

  // Send command to AI model
  async function sendCommand(command, context = null) {
    showMessage(`Executing: ${command}...`, 'info');
    
    try {
      // Get API key and model from settings
      const { apiKey, model, temperature } = await chrome.storage.sync.get(['apiKey', 'model', 'temperature']);
      
      if (!apiKey) {
        showMessage('Please add your API key in settings', 'warning');
        openSettings();
        return false;
      }
      
      // Prepare messages array
      let messages = [];
      
      // Add system message for command and context if present
      if (isUseUrlContext && context && context.content) {
        messages.push({
          role: 'system',
          content: `You are an AI assistant analyzing web content from: ${context.url || 'unknown URL'}
Title: ${context.title || 'untitled'}
Please perform the following command: "${command}"
Use this content as context for your response. Page content:
${context.content.substring(0, 5000)}...`
        });
      } else {
        messages.push({
          role: 'system',
          content: `You are an AI assistant. Please perform the following command: "${command}"`
        });
      }
      
      // Add the command as a user message
      messages.push({ role: 'user', content: command });
      
      // Prepare API request
      const response = await fetch(`${API_CONFIG.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': API_CONFIG.openRouter.referer || 'https://github.com/extension'
        },
        body: JSON.stringify({
          model: model || 'open-r1/olympiccoder-7b:free',
          messages,
          temperature: parseFloat(temperature || 0.7),
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'No response received';
      
      // Update UI
      result.innerHTML = formatResponse(aiResponse);
      currentResponse = aiResponse;
      resultContainer.classList.remove('hidden');
      
      // Update conversation history
      conversationHistory.push({ role: 'user', content: command });
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      
      // Update current chat if available
      if (currentChat) {
        currentChat.addMessage('user', command);
        currentChat.addMessage('assistant', aiResponse);
        if (currentChat.messages.length === 2) { // First message pair
          currentChat.title = command.substring(0, 30) + (command.length > 30 ? '...' : '');
        }
        saveCurrentChat();
        renderChatList();
      }
      
      showMessage('Command executed successfully', 'success');
      return true;
    } catch (error) {
      console.error("API error:", error);
      showMessage(`Error: ${error.message}`, 'error');
      return false;
    }
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

  // Settings panel handling without backdrop
  function openSettings() {
    console.log("Opening settings panel");
    settingsPanel.classList.remove('hidden');
    settingsBtn.classList.add('active');
    
    // Allow DOM to update before adding show class for animation
    setTimeout(() => {
      settingsPanel.classList.add('show');
    }, 10);
  }

  function closeSettings() {
    console.log("Closing settings panel");
    settingsPanel.classList.remove('show');
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

  // Add event listener to close settings when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && 
        !settingsBtn.contains(e.target) && 
        !settingsPanel.classList.contains('hidden')) {
      closeSettings();
    }
  });

  // Ensure the settings panel is interactive
  if (settingsPanel) {
    settingsPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Set up save settings button
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Save settings button clicked");
      
      // Save the current settings to chrome.storage
      try {
        const settings = {
          apiKey: apiKeyInput.value,
          model: modelSelect.value,
          temperature: temperatureSlider.value,
          useUrlContext: isUseUrlContext,
          botName: document.getElementById('botName').value,
          personalityPreset: document.getElementById('personalityPreset').value,
          customPersonality: document.getElementById('customPersonality').value
        };
        
        await chrome.storage.sync.set(settings);
        showMessage('Settings saved successfully', 'success');
        closeSettings();
        
        // Apply the new settings immediately
        if (isUseUrlContext) {
          getCurrentPageContext();
        } else {
          urlIndicator.classList.add('hidden');
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Failed to save settings', 'error');
      }
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

  // Load saved settings from chrome.storage
  async function loadSettings() {
    try {
      // Use chrome.storage.sync to get settings
      const result = await chrome.storage.sync.get({
        // Default values if not found
        apiKey: '',
        model: 'open-r1/olympiccoder-7b:free', // Default to first model in the list
        temperature: '0.7',
        useUrlContext: true,
        botName: 'AI Assistant',
        personalityPreset: 'professional',
        customPersonality: ''
      });
      
      console.log("Settings loaded successfully");
      
      // Apply the loaded settings
      if (apiKeyInput) apiKeyInput.value = result.apiKey || '';
      
      // Update model options
      if (result.apiKey) {
        await updateModelOptions(result.apiKey);
        if (result.model && modelSelect) {
          modelSelect.value = result.model;
        }
      }
      
      // Update temperature slider
      if (temperatureSlider && temperatureValue && result.temperature) {
        temperatureSlider.value = result.temperature;
        temperatureValue.textContent = result.temperature;
      }
      
      // Update context mode
      isUseUrlContext = result.useUrlContext !== undefined ? result.useUrlContext : true;
      updateModeButtons();
      
      // Update bot personality settings
      const botNameInput = document.getElementById('botName');
      const personalityPresetSelect = document.getElementById('personalityPreset');
      const customPersonalityTextarea = document.getElementById('customPersonality');
      
      if (botNameInput) {
        botNameInput.value = result.botName || 'AI Assistant';
      }
      
      if (personalityPresetSelect) {
        personalityPresetSelect.value = result.personalityPreset || 'professional';
        
        // Update the custom personality textarea state
        if (customPersonalityTextarea) {
          customPersonalityTextarea.value = result.customPersonality || '';
          customPersonalityTextarea.disabled = result.personalityPreset !== 'custom';
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Failed to load settings, using defaults', 'warning');
      return {
        apiKey: '',
        model: 'open-r1/olympiccoder-7b:free',
        temperature: '0.7',
        useUrlContext: true,
        botName: 'AI Assistant',
        personalityPreset: 'professional',
        customPersonality: ''
      };
    }
  }

  // Initialize chat functionality
  async function initializeChat() {
    try {
      const chats = await loadChats();
      
      // Try to get last active chat ID - fall back to first chat or create new one
      let lastActiveChatId = null;
      try {
        const result = await chrome.storage.local.get('lastActiveChatId');
        lastActiveChatId = result.lastActiveChatId;
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

  // Set up mode selection buttons
  if (basicModeBtn && urlModeBtn) {
    basicModeBtn.addEventListener('click', async () => {
      isUseUrlContext = false;
      updateModeButtons();
      // Save the preference
      try {
        await chrome.storage.sync.set({ useUrlContext: false });
      } catch (error) {
        console.error('Error saving context mode preference:', error);
      }
    });
    
    urlModeBtn.addEventListener('click', async () => {
      isUseUrlContext = true;
      updateModeButtons();
      // Save the preference
      try {
        await chrome.storage.sync.set({ useUrlContext: true });
        await getCurrentPageContext(); // Refresh the context immediately
      } catch (error) {
        console.error('Error saving context mode preference:', error);
      }
    });
  }

  // Set up main action buttons
  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const query = searchInput.value.trim();
      if (!query) {
        showMessage('Please enter a question or query', 'warning');
        return;
      }
      
      const context = isUseUrlContext ? await getCurrentPageContext() : null;
      await processQuery(query, context);
    });
  }

  // Set up analyze page button
  if (analyzePageBtn) {
    analyzePageBtn.addEventListener('click', async () => {
      const context = await getCurrentPageContext();
      if (!context) {
        showMessage('No page content available to analyze', 'warning');
        return;
      }
      
      await sendCommand('Analyze this page and provide a detailed analysis of its content', context);
    });
  }

  // Set up summarize button
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      const context = await getCurrentPageContext();
      if (!context) {
        showMessage('No page content available to summarize', 'warning');
        return;
      }
      
      await sendCommand('Summarize this page in a concise manner, highlighting the key points', context);
    });
  }

  // Set up key points button
  if (keyPointsBtn) {
    keyPointsBtn.addEventListener('click', async () => {
      const context = await getCurrentPageContext();
      if (!context) {
        showMessage('No page content available to extract key points from', 'warning');
        return;
      }
      
      await sendCommand('Extract and list the key points from this page as bullet points', context);
    });
  }

  // Set up copy button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!currentResponse) {
        showMessage('No content to copy', 'warning');
        return;
      }
      
      navigator.clipboard.writeText(currentResponse)
        .then(() => showMessage('Copied to clipboard', 'success'))
        .catch(err => {
          console.error('Copy failed:', err);
          showMessage('Failed to copy to clipboard', 'error');
        });
    });
  }

  // Set up export button and menu
  if (exportBtn && exportMenu) {
    // Toggle export menu visibility
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('show');
      
      // Close menu when clicking anywhere else
      const closeExportMenu = (event) => {
        if (!exportMenu.contains(event.target) && event.target !== exportBtn) {
          exportMenu.classList.remove('show');
          document.removeEventListener('click', closeExportMenu);
        }
      };
      
      if (exportMenu.classList.contains('show')) {
        setTimeout(() => {
          document.addEventListener('click', closeExportMenu);
        }, 10);
      }
    });
    
    // Handle export format selection
    exportMenu.querySelectorAll('.export-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const format = e.currentTarget.dataset.format;
        if (format) {
          exportResult(format);
          exportMenu.classList.remove('show');
        }
      });
    });
  }

  // Set up reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetChat();
      showMessage('Conversation reset', 'info');
    });
  }

  // Set up share button
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (!currentResponse) {
        showMessage('No content to share', 'warning');
        return;
      }
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: 'AI Assistant Response',
            text: currentResponse
          });
          showMessage('Shared successfully', 'success');
        } else {
          // Fallback for browsers without Web Share API
          copyBtn.click();
          showMessage('Copied to clipboard for sharing', 'info');
        }
      } catch (error) {
        console.error('Share failed:', error);
        showMessage('Failed to share content', 'error');
      }
    });
  }

  // Set up voice input button
  if (voiceInputBtn) {
    voiceInputBtn.addEventListener('click', () => {
      if (!('webkitSpeechRecognition' in window)) {
        showMessage('Speech recognition not supported in this browser', 'warning');
        return;
      }
      
      if (isRecording) {
        // Stop recording logic
        if (window.recognition) {
          window.recognition.stop();
          isRecording = false;
          voiceInputBtn.classList.remove('active');
          voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
        }
      } else {
        // Start recording logic
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        
        recognition.onstart = () => {
          isRecording = true;
          voiceInputBtn.classList.add('active');
          voiceInputBtn.querySelector('.material-icons').textContent = 'mic_off';
          showMessage('Listening...', 'info');
        };
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          searchInput.value = finalTranscript + interimTranscript;
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          showMessage(`Voice input error: ${event.error}`, 'error');
          isRecording = false;
          voiceInputBtn.classList.remove('active');
          voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
        };
        
        recognition.onend = () => {
          isRecording = false;
          voiceInputBtn.classList.remove('active');
          voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
        };
        
        window.recognition = recognition;
        recognition.start();
      }
    });
  }

  // Listen for Enter key in search input
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        searchBtn.click();
      }
    });
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
