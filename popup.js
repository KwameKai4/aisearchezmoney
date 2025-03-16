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
        'useUrlContext'
      ]);
      
      if (settings.apiKey) {
        apiKeyInput.value = settings.apiKey;
        await updateModelOptions(settings.apiKey);
        
        if (settings.model) {
          modelSelect.value = settings.model;
        }
      }
      
      if (settings.temperature) {
        const temperatureSlider = document.getElementById('temperature');
        const temperatureValue = document.getElementById('temperatureValue');
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature;
      }
      
      isUseUrlContext = settings.useUrlContext !== undefined ? settings.useUrlContext : true;
      updateModeButtons();
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

  // Add input validation feedback
  apiKeyInput.addEventListener('input', () => {
    const isValid = apiKeyInput.value.trim().length >= 32;
    apiKeyInput.classList.toggle('valid', isValid);
    apiKeyInput.classList.toggle('invalid', !isValid && apiKeyInput.value.trim().length > 0);
  });

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
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    
    setTimeout(() => {
      messageDiv.className = 'message';
    }, 3000);
  }

  // Update save settings handler with validation
  saveSettingsBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const temperature = document.getElementById('temperature')?.value || 0.7;

    try {
      // Validate API key first
      await validateApiKey(apiKey);

      const settings = {
        apiKey,
        model,
        temperature,
        useUrlContext: isUseUrlContext
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

  // Toggle settings panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Close settings when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.classList.contains('hidden') && 
        !settingsPanel.contains(e.target) && 
        e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
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
    
    let systemPrompt = `You are a helpful AI assistant. The user has requested to ${command.toLowerCase()} the current web page they're viewing.`;
    
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
      
      return responseText;
    } catch (error) {
      console.error('API error:', error);
      result.textContent = 'Error: Could not get a response. Please check your settings and try again.';
      showMessage('Failed to execute command', 'error');
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
    
    let systemPrompt = 'You are a helpful AI assistant.';
    
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
      
      // Update conversation history
      conversationHistory.push({ role: 'user', content: query });
      conversationHistory.push({ role: 'assistant', content: responseText });
      
      return responseText;
    } catch (error) {
      console.error('API error:', error);
      result.textContent = 'Error: Could not get a response. Please check your settings and try again.';
      showMessage('Failed to get response from AI', 'error');
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
    conversationHistory = [];
    currentQuery = '';
    currentResponse = '';
    result.textContent = '';
    resultContainer.classList.add('hidden');
    searchInput.value = '';
    showMessage('Conversation reset', 'success');
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

  // Analysis buttons with direct commands
  analyzePageBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      showMessage('No page context available to analyze', 'error');
      return;
    }
    
    if (!context.content) {
      showMessage('Page content is not accessible. Try refreshing the page.', 'warning');
      return;
    }
    
    // Send a direct command instead of constructing a query
    sendCommand('Analyze this page in detail and explain the main topics covered', context);
  });
  
  summarizeBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      showMessage('No page context available to summarize', 'error');
      return;
    }
    
    if (!context.content) {
      showMessage('Page content is not accessible. Try refreshing the page.', 'warning');
      return;
    }
    
    // Send a direct command instead of constructing a query
    sendCommand('Provide a concise summary of this page', context);
  });
  
  keyPointsBtn.addEventListener('click', async () => {
    const context = await getCurrentPageContext();
    
    if (!context) {
      showMessage('No page context available to extract key points', 'error');
      return;
    }
    
    if (!context.content) {
      showMessage('Page content is not accessible. Try refreshing the page.', 'warning');
      return;
    }
    
    // Send a direct command instead of constructing a query
    sendCommand('List the key points from this page as bullet points', context);
  });

  // Initialize
  await loadSettings();
  await getCurrentPageContext();
});
