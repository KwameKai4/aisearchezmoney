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
  // UI Elements
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
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn = document.getElementById('shareBtn');
  const messageDiv = document.getElementById('message');
  const urlIndicator = document.getElementById('urlContextIndicator');
  const newChatBtn = document.getElementById('newChatBtn');
  const chatList = document.getElementById('chatList');
  
  // Analysis buttons
  const analyzePageBtn = document.getElementById('analyzePageBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const keyPointsBtn = document.getElementById('keyPointsBtn');

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

  // Initialize chat functionality
  newChatBtn.addEventListener('click', createNewChat);

  // Load last active chat or create new one
  async function initializeChat() {
    const chats = await loadChats();
    const { lastActiveChatId } = await chrome.storage.local.get('lastActiveChatId');
    
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
  }

  // Mode selection buttons
  const basicModeBtn = document.getElementById('basicModeBtn');
  const urlModeBtn = document.getElementById('urlModeBtn');

  // Load saved settings
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'apiKey', 
        'model', 
        'temperature', 
        'useUrlContext',
        'botName',
        'personalityPreset',
        'customPersonality'
      ]);
      
      // Load API key and model settings
      if (settings.apiKey) {
        apiKeyInput.value = settings.apiKey;
        await updateModelOptions(settings.apiKey);
        if (settings.model) {
          modelSelect.value = settings.model;
        }
      }
      
      // Load temperature setting
      const temperatureSlider = document.getElementById('temperature');
      const temperatureValue = document.getElementById('temperatureValue');
      if (settings.temperature) {
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature;
      }
      
      // Load context mode setting
      isUseUrlContext = settings.useUrlContext !== undefined ? settings.useUrlContext : true;
      updateModeButtons();
      
      // Load bot name and personality settings
      const botNameInput = document.getElementById('botName');
      const personalityPreset = document.getElementById('personalityPreset');
      const customPersonality = document.getElementById('customPersonality');
      
      if (botNameInput) {
        botNameInput.value = settings.botName || 'AI Assistant';
      }
      
      if (personalityPreset) {
        personalityPreset.value = settings.personalityPreset || 'professional';
        // Handle custom personality textarea
        if (customPersonality) {
          customPersonality.value = settings.customPersonality || '';
          customPersonality.disabled = settings.personalityPreset !== 'custom';
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // API key validation
  async function validateApiKey(apiKey) {
    if (!apiKey || apiKey.trim().length < 32) {
      throw new Error('Invalid API key format');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': API_CONFIG.openRouter.referer,
          'X-Title': API_CONFIG.app.name
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      const data = await response.json();
      return {
        valid: true,
        quota: data.quota || {},
        remaining: data.remaining || null
      };
    } catch (error) {
      console.error('API key validation error:', error);
      throw new Error('Could not validate API key');
    }
  }

  // Enhanced input validation
  function validateInput(input, validationFn, errorMessage) {
    const isValid = validationFn(input.value.trim());
    let feedbackDiv = input.nextElementSibling;
    
    if (!feedbackDiv || !feedbackDiv.classList.contains('input-feedback')) {
      feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'input-feedback';
      input.parentNode.insertBefore(feedbackDiv, input.nextSibling);
    }
    
    input.classList.toggle('valid', isValid);
    input.classList.toggle('invalid', !isValid && input.value.trim().length > 0);
    
    if (!isValid && input.value.trim().length > 0) {
      feedbackDiv.textContent = errorMessage;
      feedbackDiv.classList.add('show');
    } else {
      feedbackDiv.classList.remove('show');
    }
    
    return isValid;
  }

  // Add input validation
  apiKeyInput.addEventListener('input', () => {
    validateInput(
      apiKeyInput,
      value => value.trim().length >= 32,
      'API key should be at least 32 characters long'
    );
  });

  const botNameInput = document.getElementById('botName');
  if (botNameInput) {
    botNameInput.addEventListener('input', () => {
      validateInput(
        botNameInput,
        value => value.trim().length >= 1 && value.trim().length <= 50,
        'Bot name should be between 1 and 50 characters'
      );
    });
  }

  const customPersonalityTextarea = document.getElementById('customPersonality');
  if (customPersonalityTextarea) {
    customPersonalityTextarea.addEventListener('input', () => {
      validateInput(
        customPersonalityTextarea,
        value => value.trim().length === 0 || value.trim().length >= 10,
        'Custom personality description should be at least 10 characters'
      );
    });
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
      AVAILABLE_MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
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

  // Show message helper
  function showMessage(text, type = 'info') {
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
    setTimeout(() => {
      messageDiv.classList.remove('show');
    }, 3000);
  }

  // Update save settings handler with validation
  saveSettingsBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const temperature = document.getElementById('temperature')?.value || 0.7;
    const botName = document.getElementById('botName').value.trim();
    const personalityPreset = document.getElementById('personalityPreset').value;
    const customPersonality = document.getElementById('customPersonality').value.trim();

    try {
      // Validate API key first
      await validateApiKey(apiKey);

      const settings = {
        apiKey,
        model,
        temperature,
        useUrlContext: isUseUrlContext,
        botName: botName || 'AI Assistant',
        personalityPreset,
        customPersonality
      };

      await chrome.storage.sync.set(settings);
      await updateModelOptions(apiKey);
      showMessage('Settings saved successfully', 'success');
      settingsPanel.classList.add('hidden');
    } catch (error) {
      showMessage(error.message, 'error');
      apiKeyInput.classList.add('invalid');
      setTimeout(() => apiKeyInput.classList.remove('invalid'), 3000);
    }
  });

  // Settings panel handling
  const settingsBackdrop = document.getElementById('settingsBackdrop');

  function openSettings() {
    settingsPanel.classList.remove('hidden');
    settingsBackdrop.classList.add('show');
    settingsBtn.classList.add('active');
    // Allow DOM to update before adding show class for animation
    requestAnimationFrame(() => {
      settingsPanel.classList.add('show');
    });
  }

  function closeSettings() {
    settingsPanel.classList.remove('show');
    settingsBackdrop.classList.remove('show');
    settingsBtn.classList.remove('active');
    // Wait for animation to complete before hiding
    setTimeout(() => {
      settingsPanel.classList.add('hidden');
    }, 300);
  }

  // Toggle settings panel
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (settingsPanel.classList.contains('hidden')) {
      openSettings();
    } else {
      closeSettings();
    }
  });

  // Close settings when clicking on backdrop
  settingsBackdrop.addEventListener('click', closeSettings);
  
  // Prevent clicks inside settings panel from closing it
  settingsPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) {
      closeSettings();
    }
  });

  // Close settings when clicking save button
  saveSettingsBtn.addEventListener('click', async () => {
    try {
      const apiKey = apiKeyInput.value.trim();
      const model = modelSelect.value;
      const temperature = document.getElementById('temperature')?.value || 0.7;
      const botName = document.getElementById('botName')?.value.trim();
      const personalityPreset = document.getElementById('personalityPreset')?.value;
      const customPersonality = document.getElementById('customPersonality')?.value.trim();

      // Validate required fields
      if (!apiKey) {
        throw new Error('API key is required');
      }
      if (!botName) {
        throw new Error('Bot name is required');
      }
      if (personalityPreset === 'custom' && !customPersonality) {
        throw new Error('Custom personality description is required when using custom preset');
      }

      // Validate API key
      await validateApiKey(apiKey);

      const settings = {
        apiKey,
        model,
        temperature,
        useUrlContext: isUseUrlContext,
        botName,
        personalityPreset,
        customPersonality: personalityPreset === 'custom' ? customPersonality : ''
      };

      await chrome.storage.sync.set(settings);
      await updateModelOptions(apiKey);
      showMessage('Settings saved successfully', 'success');
      closeSettings();
    } catch (error) {
      showMessage(error.message || 'Failed to save settings', 'error');
      console.error('Settings save error:', error);
    }
  });

  // Settings tab handling
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
  
  temperatureSlider.addEventListener('input', () => {
    temperatureValue.textContent = temperatureSlider.value;
  });

  // Get current page context
  async function getCurrentPageContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return null;
      
      currentUrl = tab.url;
      pageTitle = tab.title;
      
      // Show URL context indicator
      if (isUseUrlContext) {
        urlIndicator.textContent = `Using context from: ${tab.title}`;
        urlIndicator.classList.remove('hidden');
      } else {
        urlIndicator.classList.add('hidden');
        return { url: tab.url, title: tab.title, content: null };
      }
      
      // Get page content - try direct messaging first
      if (isUseUrlContext) {
        try {
          // Try sending a message directly to the content script
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' })
            .catch(async () => {
              // If direct messaging fails, use the scripting API to inject and execute the content script
              console.log("Direct messaging failed, injecting content script");
              
              // Check if we have the scripting permission
              const hasPermission = await chrome.permissions.contains({ permissions: ['scripting'] });
              if (!hasPermission) {
                throw new Error('Missing scripting permission');
              }
              
              // Inject the content script
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                  // This function executes in the context of the page
                  return {
                    content: document.body.innerText,
                    title: document.title
                  };
                }
              }).then(injectionResults => {
                if (injectionResults && injectionResults[0]) {
                  return injectionResults[0].result;
                }
                return null;
              });
            });

          if (response && response.content) {
            pageContent = response.content;
            return { url: tab.url, title: tab.title, content: pageContent };
          }
          
          // If we still don't have content, try through background script
          const bgResponse = await chrome.runtime.sendMessage({ 
            type: 'extractContent',
            tabId: tab.id 
          });
          
          if (bgResponse && bgResponse.content) {
            pageContent = bgResponse.content;
            return { url: tab.url, title: tab.title, content: pageContent };
          }
        } catch (error) {
          console.error('Error in content script communication:', error);
          showMessage('Using URL without page content', 'warning');
          // Continue with URL only
          return { url: tab.url, title: tab.title, content: null };
        }
      }
      
      return { url: tab.url, title: tab.title, content: pageContent || null };
    } catch (error) {
      console.error('Error getting page context:', error);
      showMessage('Could not access page content', 'error');
      return null;
    }
  }
  
  // Send command to AI model - simplified version for buttons
  async function sendCommand(command, context = null) {
    // Update breadcrumb
    document.getElementById('currentContext').textContent = context?.title || 'Current Page';
    document.getElementById('currentAction').textContent = command;
    showMessage(`Executing: ${command}...`, 'info');
    
    const settings = await chrome.storage.sync.get(['apiKey', 'model', 'temperature']);
    
    if (!settings.apiKey) {
      showMessage('Please set your API key in settings', 'error');
      settingsPanel.classList.remove('hidden');
      return;
    }
    
    const apiKey = settings.apiKey;
    const model = settings.model || AVAILABLE_MODELS[0].id;
    const temperature = settings.temperature || 0.7;
    
    const personalitySettings = await chrome.storage.sync.get(['botName', 'personalityPreset', 'customPersonality']);
    const botName = personalitySettings.botName || 'AI Assistant';
    let personality = '';
    
    switch (personalitySettings.personalityPreset) {
      case 'professional':
        personality = 'You are professional, formal, and business-focused in your communication';
        break;
      case 'friendly':
        personality = 'You are warm, friendly, and conversational in your communication';
        break;
      case 'technical':
        personality = 'You are technically precise and detailed in your communication';
        break;
      case 'custom':
        personality = personalitySettings.customPersonality || '';
        break;
    }

    let systemPrompt = `You are ${botName}. ${personality}. The user has requested to ${command.toLowerCase()} the current web page they're viewing.`;
    
    if (context && isUseUrlContext) {
      systemPrompt += ` The page title is "${context.title}" (${context.url}).`;
      if (context.content) {
        // Truncate content if too long
        const truncatedContent = context.content.substring(0, 4000) + 
          (context.content.length > 4000 ? '... (content truncated)' : '');
        systemPrompt += ` Here's the page content: ${truncatedContent}`;
      }
    }
    
    try {
      result.textContent = 'Processing...';
      resultContainer.classList.remove('hidden');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': API_CONFIG.openRouter.referer,
          'X-Title': API_CONFIG.app.name
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${command}` }
          ],
          temperature: parseFloat(temperature)
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const responseText = data.choices[0].message.content;
      
      result.innerHTML = formatResponse(responseText);
      currentResponse = responseText;

      // Update current chat
      if (currentChat) {
        currentChat.addMessage('user', command);
        currentChat.addMessage('assistant', responseText);
        const chats = await loadChats();
        const index = chats.findIndex(c => c.id === currentChat.id);
        if (index !== -1) {
          chats[index] = currentChat;
          await saveChats(chats);
        }
      }
      
      return responseText;
    } catch (error) {
      console.error('API error:', error);
      
      // Determine error type and show appropriate message
      let errorMessage = 'Failed to execute command';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again';
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.message.includes('status: 429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment';
      } else if (error.message.includes('status: 401')) {
        errorMessage = 'Invalid API key or authorization expired';
        settingsPanel.classList.remove('hidden');
      }

      result.textContent = `Error: ${errorMessage}`;
      showMessage(errorMessage, 'error');

      // Retry logic for network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        showMessage('Retrying in 5 seconds...', 'info');
        setTimeout(() => {
          sendCommand(command, context);
        }, 5000);
      }
      
      // Clear invalid API key if authentication failed
      if (error.message.includes('status: 401')) {
        await chrome.storage.sync.remove('apiKey');
        await updateModelOptions(null);
      }
    }
  }

  // Original send query function (for search box)
  async function sendQuery(query, context = null) {
    const settings = await chrome.storage.sync.get(['apiKey', 'model', 'temperature']);
    
    if (!settings.apiKey) {
      showMessage('Please set your API key in settings', 'error');
      settingsPanel.classList.remove('hidden');
      return;
    }
    
    const apiKey = settings.apiKey;
    const model = settings.model || AVAILABLE_MODELS[0].id;
    const temperature = settings.temperature || 0.7;
    
    const personalitySettings = await chrome.storage.sync.get(['botName', 'personalityPreset', 'customPersonality']);
    const botName = personalitySettings.botName || 'AI Assistant';
    let personality = '';
    
    switch (personalitySettings.personalityPreset) {
      case 'professional':
        personality = 'You are professional, formal, and business-focused in your communication';
        break;
      case 'friendly':
        personality = 'You are warm, friendly, and conversational in your communication';
        break;
      case 'technical':
        personality = 'You are technically precise and detailed in your communication';
        break;
      case 'custom':
        personality = personalitySettings.customPersonality || '';
        break;
    }

    let systemPrompt = `You are ${botName}. ${personality}.`;
    
    if (context && isUseUrlContext) {
      systemPrompt += ` The user is currently browsing ${context.title} (${context.url}).`;
      if (context.content) {
        // Truncate content if too long
        const truncatedContent = context.content.substring(0, 4000) + 
          (context.content.length > 4000 ? '... (content truncated)' : '');
        systemPrompt += ` Here's the page content: ${truncatedContent}`;
      }
    }
    
    try {
      result.textContent = 'Thinking...';
      resultContainer.classList.remove('hidden');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': API_CONFIG.openRouter.referer,
          'X-Title': API_CONFIG.app.name
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: query }
          ],
          temperature: parseFloat(temperature)
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const responseText = data.choices[0].message.content;
      
      result.innerHTML = formatResponse(responseText);
      currentResponse = responseText;
      
      // Update conversation history and current chat
      conversationHistory.push({ role: 'user', content: query });
      conversationHistory.push({ role: 'assistant', content: responseText });
      
      if (currentChat) {
        currentChat.addMessage('user', query);
        currentChat.addMessage('assistant', responseText);
        if (currentChat.messages.length === 2) { // First message pair
          currentChat.title = query.substring(0, 30) + (query.length > 30 ? '...' : '');
        }
        const chats = await loadChats();
        const index = chats.findIndex(c => c.id === currentChat.id);
        if (index !== -1) {
          chats[index] = currentChat;
          await saveChats(chats);
          renderChatList();
        }
      }
      
      return responseText;
    } catch (error) {
      console.error('API error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to get response from AI';
      let shouldRetry = false;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again';
        shouldRetry = true;
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection';
        shouldRetry = true;
      } else if (error.message.includes('status: 429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment';
        setTimeout(() => {
          showMessage('You can try again now', 'info');
        }, 10000);
      } else if (error.message.includes('status: 401')) {
        errorMessage = 'Invalid API key or authorization expired';
        settingsPanel.classList.remove('hidden');
        await chrome.storage.sync.remove('apiKey');
        await updateModelOptions(null);
      }
      
      result.textContent = `Error: ${errorMessage}`;
      showMessage(errorMessage, 'error');
      
      // Automatic retry for network errors
      if (shouldRetry) {
        const retryDelay = 5000;
        showMessage(`Retrying in ${retryDelay/1000} seconds...`, 'info');
        setTimeout(() => {
          sendQuery(query, context);
        }, retryDelay);
      }
    }
  }

  // Format response (convert markdown-like syntax)
  function formatResponse(text) {
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

  // Mode selection
  function updateModeButtons() {
    basicModeBtn.classList.toggle('active', !isUseUrlContext);
    urlModeBtn.classList.toggle('active', isUseUrlContext);
    
    if (isUseUrlContext) {
      getCurrentPageContext();
    } else {
      urlIndicator.classList.add('hidden');
    }
  }
  
  basicModeBtn.addEventListener('click', () => {
    isUseUrlContext = false;
    updateModeButtons();
  });
  
  urlModeBtn.addEventListener('click', () => {
    isUseUrlContext = true;
    updateModeButtons();
  });

  // Copy to clipboard
  copyBtn.addEventListener('click', () => {
    if (currentResponse) {
      navigator.clipboard.writeText(currentResponse)
        .then(() => showMessage('Copied to clipboard', 'success'))
        .catch(() => showMessage('Failed to copy', 'error'));
    }
  });

  // Download as text file
  downloadBtn.addEventListener('click', () => {
    if (currentResponse) {
      const blob = new Blob([currentResponse], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = 'response.txt';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      showMessage('Downloaded successfully', 'success');
    }
  });

  // Share functionality
  shareBtn.addEventListener('click', () => {
    if (currentResponse && navigator.share) {
      navigator.share({
        title: 'AI Response',
        text: currentResponse,
      })
      .then(() => showMessage('Shared successfully', 'success'))
      .catch((error) => {
        console.error('Error sharing:', error);
        showMessage('Failed to share', 'error');
      });
    } else {
      copyBtn.click(); // Fallback to copying if Web Share API is not available
    }
  });

  // Reset the conversation
  resetBtn.addEventListener('click', () => {
    showConfirmDialog('Are you sure you want to start a new chat? This will clear the current conversation.', async () => {
      await createNewChat();
      showMessage('Started new chat', 'success');
    });
  });

  // Search button handler
  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      showMessage('Please enter a query', 'error');
      return;
    }
    
    currentQuery = query;
    const context = await getCurrentPageContext();
    sendQuery(query, context);
    
    // Clear the search input field after search
    searchInput.value = '';
  });

  // Handle Enter key in search input
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchBtn.click();
    }
  });

  // Voice input
  voiceInputBtn.addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window)) {
      showMessage('Speech recognition not supported in your browser', 'error');
      return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      voiceInputBtn.classList.remove('recording');
      return;
    }
    
    recognition.onstart = () => {
      isRecording = true;
      voiceInputBtn.classList.add('recording');
      showMessage('Listening...', 'info');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      searchInput.value = transcript;
      showMessage('Voice input received', 'success');
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      showMessage('Could not recognize speech', 'error');
      isRecording = false;
      voiceInputBtn.classList.remove('recording');
    };
    
    recognition.onend = () => {
      isRecording = false;
      voiceInputBtn.classList.remove('recording');
    };
    
    recognition.start();
  });

  // Analysis buttons with direct commands - modified to work even without full content
  analyzePageBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      // If we can't get any context at all, show error and exit
      showMessage('No page context available to analyze', 'error');
      return;
    }
    
    // Always proceed, even if content is null
    sendCommand('Analyze this page in detail and explain the main topics covered', context);
  });
  
  summarizeBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      // If we can't get any context at all, show error and exit
      showMessage('No page context available to summarize', 'error');
      return;
    }
    
    // Always proceed, even if content is null
    sendCommand('Provide a concise summary of this page', context);
  });
  
  keyPointsBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      // If we can't get any context at all, show error and exit
      showMessage('No page context available to extract key points', 'error');
      return;
    }
    
    // Always proceed, even if content is null
    sendCommand('List the key points from this page as bullet points', context);
  });

  // Load personality settings
  function loadPersonalitySettings(settings) {
    const botNameInput = document.getElementById('botName');
    const personalityPresetSelect = document.getElementById('personalityPreset');
    const customPersonalityTextarea = document.getElementById('customPersonality');

    if (settings.botName) {
      botNameInput.value = settings.botName;
    }
    if (settings.personalityPreset) {
      personalityPresetSelect.value = settings.personalityPreset;
    }
    if (settings.customPersonality) {
      customPersonalityTextarea.value = settings.customPersonality;
    }
  }

  // Handle personality preset changes
  document.getElementById('personalityPreset').addEventListener('change', (e) => {
    const customPersonalityTextarea = document.getElementById('customPersonality');
    if (e.target.value === 'custom') {
      customPersonalityTextarea.removeAttribute('disabled');
    } else {
      customPersonalityTextarea.setAttribute('disabled', 'disabled');
      customPersonalityTextarea.value = '';
    }
  });

  // Cleanup function to remove event listeners
  function cleanup() {
    // Remove document-level listeners
    document.removeEventListener('click', handleOutsideClick);
    
    // Remove tab button listeners
    tabButtons.forEach(button => {
      button.removeEventListener('click', handleTabClick);
    });

    // Remove voice recognition if active
    if (isRecording && window.webkitSpeechRecognition) {
      recognition?.stop();
    }

    // Remove all message timeouts
    clearTimeout(messageTimeout);
  }

  // Handle outside clicks for settings panel
  const handleOutsideClick = (e) => {
    if (!settingsPanel.classList.contains('hidden') && 
        !settingsPanel.contains(e.target) && 
        e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
    }
  };

  // Handle tab clicks
  const handleTabClick = function() {
    const tab = this.dataset.tab;
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
  };

  // Update event listeners with named functions
  document.addEventListener('click', handleOutsideClick);
  tabButtons.forEach(button => {
    button.addEventListener('click', handleTabClick);
  });

  // Initialize
  await loadSettings().then(settings => {
    if (settings) {
      loadPersonalitySettings(settings);
    }
  });
  await getCurrentPageContext();
  await initializeChat();

  // Add cleanup on window unload
  window.addEventListener('unload', cleanup);
});
