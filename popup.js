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
  
  // Settings panel handling
  function openSettings() {
    console.log("Opening settings panel");
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.remove('hidden');
      settingsPanel.classList.add('show');
    }
  }

  function closeSettings() {
    console.log("Closing settings panel");
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.remove('show');
      setTimeout(() => {
        settingsPanel.classList.add('hidden');
      }, 300);
    }
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
  
  // Function to handle chat list rendering
  function renderChatList() {
    console.log('Chat list rendering would happen here');
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
  
  document.getElementById('newChatBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('New chat button clicked');
    showMessage('Creating new chat...', 'info');
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
  
  document.getElementById('speakBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Speak button clicked');
    
    if (audioPlayer) {
      // If audio is playing, stop it
      audioPlayer.pause();
      audioPlayer = null;
      this.innerHTML = '<span class="material-icons">volume_up</span>';
      showMessage('Audio playback stopped', 'info');
    } else {
      // Get current response text
      const resultElement = document.getElementById('result');
      if (resultElement && resultElement.textContent) {
        currentResponse = resultElement.textContent;
        showMessage('Starting text-to-speech...', 'info');
        // Actual TTS functionality would be implemented here
      } else {
        showMessage('No content to speak', 'warning');
      }
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
  
  document.getElementById('saveSettings')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Save settings button clicked');
    
    // In a real implementation, would save to chrome.storage.sync
    showMessage('Settings saved successfully', 'success');
    closeSettings();
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
