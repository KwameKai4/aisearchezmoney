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
  console.log("DOM fully loaded and parsed");
  
  // Global variables
  let isUseUrlContext = true;
  let currentChat = null;
  let currentResponse = null;
  let audioPlayer = null;
  
  // Utility to show messages
  function showMessage(message, type = 'info') {
    console.log(`Message: ${message} (${type})`);
    const msgElement = document.getElementById('message');
    if (!msgElement) return;
    
    msgElement.textContent = message;
    msgElement.className = `message ${type} show`;
    
    setTimeout(() => {
      msgElement.classList.remove('show');
    }, 3000);
  }
  
  // Confirmation dialog utility
  function showConfirmDialog(message, onConfirm) {
    if (confirm(message)) {
      onConfirm();
    }
  }
  
  // Settings management
  async function loadSettings() {
    const result = await chrome.storage.sync.get({
      apiKey: '',
      elevenLabsApiKey: '',
      temperature: 0.7,
      botName: 'AI Assistant',
      personalityPreset: 'professional',
      customPersonality: '',
      model: 'gpt-3.5-turbo'
    });
    
    // Populate settings fields
    document.getElementById('apiKey').value = result.apiKey;
    document.getElementById('elevenLabsApiKey').value = result.elevenLabsApiKey;
    document.getElementById('temperature').value = result.temperature;
    document.getElementById('temperatureValue').textContent = result.temperature;
    document.getElementById('botName').value = result.botName;
    document.getElementById('personalityPreset').value = result.personalityPreset;
    document.getElementById('customPersonality').value = result.customPersonality;
    document.getElementById('model').value = result.model;
    
    return result;
  }

  async function saveSettings() {
    const settings = {
      apiKey: document.getElementById('apiKey').value.trim(),
      elevenLabsApiKey: document.getElementById('elevenLabsApiKey').value.trim(),
      temperature: parseFloat(document.getElementById('temperature').value),
      botName: document.getElementById('botName').value.trim(),
      personalityPreset: document.getElementById('personalityPreset').value,
      customPersonality: document.getElementById('customPersonality').value.trim(),
      model: document.getElementById('model').value
    };

    try {
      await chrome.storage.sync.set(settings);
      showMessage('Settings saved successfully', 'success');
      closeSettings();
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
    }
  }

  // Settings panel handling
  function openSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      loadSettings().then(() => {
        // Get API key to check if we should load models
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
          updateAvailableModels();
        }
        settingsPanel.classList.remove('hidden');
        settingsPanel.classList.add('show');
      });
    }
  }

  function closeSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.remove('show');
      setTimeout(() => {
        settingsPanel.classList.add('hidden');
      }, 300);
    }
  }

  // Handle tab switching in settings
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs and buttons
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      
      // Add active class to clicked button and corresponding tab
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId + 'Tab').classList.add('active');
    });
  });

  // Temperature slider handling
  document.getElementById('temperature')?.addEventListener('input', function(e) {
    document.getElementById('temperatureValue').textContent = e.target.value;
  });

  // Personality preset handling
  document.getElementById('personalityPreset')?.addEventListener('change', function(e) {
    const customField = document.getElementById('customPersonality');
    if (customField) {
      customField.disabled = e.target.value !== 'custom';
    }
  });

  // Model selection handling
  function updateAvailableModels() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const modelSelect = document.getElementById('model');
    
    if (!apiKey) {
      modelSelect.innerHTML = '<option value="" disabled selected>Enter API key to see models</option>';
      return;
    }

    try {
      // Use imported models from models.js
      modelSelect.innerHTML = AVAILABLE_MODELS.map(model => 
        `<option value="${model.id}" title="${model.description}">
          ${model.name} (${model.provider})
        </option>`
      ).join('');
    } catch (error) {
      showMessage('Error loading models: ' + error.message, 'error');
      modelSelect.innerHTML = '<option value="" disabled selected>Error loading models</option>';
    }
  }

  // API key validation
  async function validateApiKey(key) {
    try {
      // Test the API key with a minimal request
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': API_CONFIG.openRouter.referer || window.location.origin,
          'X-Title': API_CONFIG.app.name || 'AI Search Assistant'
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 1  // Minimal response to just test API key
        })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('API validation error:', data);
        throw new Error(data.error?.message || 'Invalid API key or network error');
      }
      
      return true;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  // Validate ElevenLabs API key
  async function validateElevenLabsApiKey(key) {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': key
        }
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid ElevenLabs API key');
      }
      
      return true;
    } catch (error) {
      console.error('ElevenLabs API key validation error:', error);
      return false;
    }
  }

  // Handle API key input
  document.getElementById('apiKey')?.addEventListener('change', async function(e) {
    const key = e.target.value.trim();
    const feedback = e.target.parentElement.querySelector('.input-feedback');
    
    if (!key) {
      feedback.textContent = 'API key is required';
      feedback.style.color = 'var(--error-color)';
      return;
    }

    feedback.textContent = 'Validating...';
    const isValid = await validateApiKey(key);
    
    if (isValid) {
      feedback.textContent = 'API key is valid';
      feedback.style.color = 'var(--success-color)';
      updateAvailableModels();
    } else {
      feedback.textContent = 'Invalid API key';
      feedback.style.color = 'var(--error-color)';
    }
  });

  // Handle ElevenLabs API key input
  document.getElementById('elevenLabsApiKey')?.addEventListener('change', async function(e) {
    const key = e.target.value.trim();
    const feedback = e.target.parentElement.querySelector('.input-feedback');
    
    if (!key) {
      feedback.textContent = 'ElevenLabs API key is optional';
      feedback.style.color = 'var(--text-color-secondary)';
      return;
    }

    feedback.textContent = 'Validating...';
    const isValid = await validateElevenLabsApiKey(key);
    
    if (isValid) {
      feedback.textContent = 'ElevenLabs API key is valid';
      feedback.style.color = 'var(--success-color)';
    } else {
      feedback.textContent = 'Invalid ElevenLabs API key';
      feedback.style.color = 'var(--error-color)';
    }
  });
  
  // Chat management
  async function loadChats() {
    const { chats = [] } = await chrome.storage.sync.get({ chats: [] });
    return chats.map(chat => Chat.fromJSON(chat));
  }

  async function saveChats(chats) {
    await chrome.storage.sync.set({ chats });
  }

  async function createNewChat() {
    const chat = new Chat();
    const chats = await loadChats();
    chats.unshift(chat);
    await saveChats(chats);
    await switchChat(chat.id);
    renderChatList();
    return chat;
  }

  async function switchChat(chatId) {
    const chats = await loadChats();
    currentChat = chats.find(c => c.id === chatId);
    if (!currentChat) {
      showMessage('Chat not found', 'error');
      return;
    }
    
    // Update UI
    document.getElementById('currentContext').textContent = currentChat.title;
    renderChatMessages();
  }

  // Delete chat handler
  async function deleteChat(chatId) {
    showConfirmDialog('Are you sure you want to delete this chat?', async () => {
      const chats = await loadChats();
      const newChats = chats.filter(c => c.id !== chatId);
      await saveChats(newChats);
      
      if (currentChat?.id === chatId) {
        // If we deleted the current chat, switch to another one or create new
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
  
  function renderChatMessages() {
    if (!currentChat) return;

    const result = document.getElementById('result');
    result.innerHTML = currentChat.messages.map(msg => `
      <div class="message ${msg.role}">
        <div class="message-content">${msg.content}</div>
      </div>
    `).join('');
    
    document.getElementById('resultContainer').classList.remove('hidden');
  }
  
  // Function to handle chat list rendering
  async function renderChatList() {
    const chatList = document.getElementById('chatList');
    const chats = await loadChats();
    
    chatList.innerHTML = chats.map(chat => `
      <div class="chat-item ${chat.id === currentChat?.id ? 'active' : ''}" data-chat-id="${chat.id}">
        <div class="chat-title">${chat.title}</div>
        <button class="mui-button mui-button-icon chat-delete-btn" title="Delete Chat">
          <span class="material-icons">delete</span>
        </button>
      </div>
    `).join('');

    // Add click handlers
    chatList.querySelectorAll('.chat-item').forEach(item => {
      const chatId = item.dataset.chatId;
      
      // Title click handler for switching chats
      item.querySelector('.chat-title').addEventListener('click', () => {
        switchChat(chatId);
      });
      
      // Delete button handler
      item.querySelector('.chat-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chatId);
      });
    });
  }
  
  // Direct button event handlers to ensure they're clickable
  document.getElementById('searchBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value?.trim();
    
    if (!query) {
      showMessage('Please enter a search query', 'warning');
      return;
    }

    const resultContainer = document.getElementById('resultContainer');
    const result = document.getElementById('result');
    
    try {
      resultContainer?.classList.remove('hidden');
      result.textContent = 'Searching...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'search',
        query: query
      });
      
      if (response && response.data) {
        result.textContent = response.data;
        showMessage('Search completed successfully', 'success');
      } else {
        throw new Error('No response data');
      }
    } catch (err) {
      result.textContent = 'Search failed. Please try again.';
      showMessage('Search failed: ' + err.message, 'error');
    }
  });
  
  document.getElementById('analyzePageBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const resultContainer = document.getElementById('resultContainer');
    const result = document.getElementById('result');
    
    try {
      resultContainer?.classList.remove('hidden');
      result.textContent = 'Analyzing current page...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzePage'
      });
      
      if (response && response.data) {
        result.textContent = response.data;
        showMessage('Page analysis complete', 'success');
      } else {
        throw new Error('No response data');
      }
    } catch (err) {
      result.textContent = 'Analysis failed. Please try again.';
      showMessage('Analysis failed: ' + err.message, 'error');
    }
  });
  
  document.getElementById('summarizeBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const resultContainer = document.getElementById('resultContainer');
    const result = document.getElementById('result');
    
    try {
      resultContainer?.classList.remove('hidden');
      result.textContent = 'Generating summary...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'summarize'
      });
      
      if (response && response.data) {
        result.textContent = response.data;
        showMessage('Summary generated successfully', 'success');
      } else {
        throw new Error('No response data');
      }
    } catch (err) {
      result.textContent = 'Summary generation failed. Please try again.';
      showMessage('Summarization failed: ' + err.message, 'error');
    }
  });
  
  document.getElementById('keyPointsBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const resultContainer = document.getElementById('resultContainer');
    const result = document.getElementById('result');
    
    try {
      resultContainer?.classList.remove('hidden');
      result.textContent = 'Extracting key points...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'keyPoints'
      });
      
      if (response && response.data) {
        result.textContent = response.data;
        showMessage('Key points extracted successfully', 'success');
      } else {
        throw new Error('No response data');
      }
    } catch (err) {
      result.textContent = 'Key points extraction failed. Please try again.';
      showMessage('Key points extraction failed: ' + err.message, 'error');
    }
  });
  
  document.getElementById('settingsBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Settings button clicked');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel.classList.contains('hidden')) {
      openSettings();
    } else {
      closeSettings();
    }
  });
  
  document.getElementById('newChatBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    showMessage('Creating new chat...', 'info');
    await createNewChat();
    showMessage('New chat created', 'success');
  });
  
  document.getElementById('copyBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Copy button clicked');
    
    // Get current response text
    const resultElement = document.getElementById('result');
    if (resultElement && resultElement.textContent) {
      navigator.clipboard.writeText(resultElement.textContent)
        .then(() => showMessage('Copied to clipboard!', 'success'))
        .catch(err => showMessage('Failed to copy: ' + err, 'error'));
    } else {
      showMessage('No content to copy', 'warning');
    }
  });
  
  document.getElementById('speakBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    console.log('Speak button clicked');
    
    if (audioPlayer) {
      // If audio is playing, stop it
      audioPlayer.pause();
      audioPlayer = null;
      this.innerHTML = '<span class="material-icons">volume_up</span>';
      showMessage('Audio playback stopped', 'info');
      return;
    }

    // Get current response text
    const resultElement = document.getElementById('result');
    if (!resultElement?.textContent) {
      showMessage('No content to speak', 'warning');
      return;
    }

    // Get ElevenLabs API key from settings
    const { elevenLabsApiKey } = await chrome.storage.sync.get(['elevenLabsApiKey']);
    if (!elevenLabsApiKey) {
      showMessage('ElevenLabs API key is required for text-to-speech. Please add it in settings.', 'error');
      return;
    }

    try {
      showMessage('Generating audio...', 'info');
      this.innerHTML = '<span class="material-icons rotating">sync</span>';

      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
          text: resultElement.textContent.substring(0, 5000), // Limit text length to avoid errors
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioPlayer = new Audio(audioUrl);
      audioPlayer.onended = () => {
        this.innerHTML = '<span class="material-icons">volume_up</span>';
        audioPlayer = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audioPlayer.play();
      this.innerHTML = '<span class="material-icons">stop</span>';
      showMessage('Audio playback started', 'success');
      
    } catch (error) {
      console.error('TTS error:', error);
      this.innerHTML = '<span class="material-icons">volume_up</span>';
      showMessage('Text-to-speech failed: ' + error.message, 'error');
    }
  });
  
  document.getElementById('resetBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Reset button clicked');
    showMessage('Resetting...', 'info');
    
    // Reset the input field
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Hide the result container
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) {
      resultContainer.classList.add('hidden');
    }
  });
  
  document.getElementById('saveSettings')?.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
      showMessage('API key is required', 'error');
      return;
    }

    // Show loading state
    const saveBtn = this;
    const originalContent = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="material-icons rotating">sync</span> Validating...';
    saveBtn.disabled = true;

    try {
      // Validate OpenRouter API key
      const isApiKeyValid = await validateApiKey(apiKey);
      if (!isApiKeyValid) {
        showMessage('Invalid OpenRouter API key', 'error');
        return;
      }
      
      // Validate ElevenLabs API key if provided
      const elevenLabsApiKey = document.getElementById('elevenLabsApiKey').value.trim();
      if (elevenLabsApiKey) {
        const isElevenLabsKeyValid = await validateElevenLabsApiKey(elevenLabsApiKey);
        if (!isElevenLabsKeyValid) {
          showMessage('Invalid ElevenLabs API key', 'error');
          return;
        }
      }

      await saveSettings();
      updateAvailableModels(); // Update models list after successful save
      showMessage('Settings saved successfully', 'success');
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
    } finally {
      // Restore button state
      saveBtn.innerHTML = originalContent;
      saveBtn.disabled = false;
    }
  });
  
  // Prevent clicks within settings panel from closing it
  document.getElementById('settingsPanel')?.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Close settings when clicking outside
  document.addEventListener('click', function(e) {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (settingsPanel && !settingsPanel.classList.contains('hidden') &&
        !settingsPanel.contains(e.target) && 
        settingsBtn && !settingsBtn.contains(e.target)) {
      closeSettings();
    }
  });
  
  // Make all buttons have pointer-events auto directly from JavaScript
  document.querySelectorAll('button, .mui-button').forEach(button => {
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.position = 'relative';
    button.style.zIndex = '5';  // Ensure button is above other elements
  });
  
  // Initialize chat list
  renderChatList();
  
  console.log("Initialization complete - all event listeners attached");
});
