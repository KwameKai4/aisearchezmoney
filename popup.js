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
  const messageDiv = document.getElementById('message');
  const audioPlayer = document.getElementById('audioPlayer');
  
  // Page analysis buttons
  const analyzePageBtn = document.getElementById('analyzePageBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const keyPointsBtn = document.getElementById('keyPointsBtn');
  
  // ElevenLabs elements
  const elevenLabsKeyInput = document.getElementById('elevenLabsKey');
  const elevenLabsVoiceSelect = document.getElementById('elevenLabsVoice');
  const useElevenLabsToggle = document.getElementById('useElevenLabs');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  
  // Tab navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // State management
  let currentQuery = '';
  let currentResponse = '';
  let currentUrl = '';
  let pageContent = '';
  let pageTitle = '';
  let conversationHistory = [];
  let isUseUrlContext = true; // Default to true for URL context
  let availableElevenLabsVoices = [];
  let isPlaying = false;

  // Mode selection buttons
  const basicModeBtn = document.getElementById('basicModeBtn');
  const urlModeBtn = document.getElementById('urlModeBtn');

  // Handle mode selection
  basicModeBtn.addEventListener('click', () => {
    isUseUrlContext = false;
    basicModeBtn.classList.add('active');
    urlModeBtn.classList.remove('active');
    chrome.storage.sync.set({ useUrlContext: false });
  });

  urlModeBtn.addEventListener('click', () => {
    isUseUrlContext = true;
    urlModeBtn.classList.add('active');
    basicModeBtn.classList.remove('active');
    chrome.storage.sync.set({ useUrlContext: true });
  });
  
  // Define models - comprehensive list of free and paid models
  const freeModels = [
    // OpenAI free models
    { id: 'openchat/openchat-7b:free', name: 'GPT-3.5 Turbo (Free)' },
    
    // Google free models
    { id: 'google/gemini-2.0-flash-thinking-exp-1219:free', name: 'Gemini 2 Think (Free)' },
    { id: 'google/gemini-2.0-pro-exp-02-05:free', name: 'Gemini 2 Pro (Free)' },
    
    // Meta/Llama free models
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3 70b (Free)' },
    { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 Vision (Free)' },
    
    // Mistral free models
    { id: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free', name: 'Mistral "The Beast" (Free)' },
    { id: 'mistralai/mistral-small-24b-instruct-2501:free', name: 'Mistral Small 3 (Free)' },
    
    // DeepSeek models
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
    
    // Qwen models
    { id: 'qwen/qwq-32b:free', name: 'Qwen QwQ 32B (Free)' },
    
    // Open source models
    { id: 'nousresearch/deephermes-3-llama-3-8b-preview:free', name: 'Nous Hermes (Free)' },
    { id: 'rekaai/reka-flash-3:free', name: 'Reka Flash 3 (Free)' }
  ];
  
  const paidModels = [
    // OpenAI paid models
    { id: 'openai/gpt-4', name: 'GPT-4' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
    
    // Google paid models
    { id: 'google/gemini-pro', name: 'Gemini Pro' },
    { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    
    // Anthropic paid models
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
    
    // Meta/Llama paid models
    { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' }
  ];

  // Function to check if a model is in the free list
  function isModelFree(modelId) {
    return freeModels.some(model => model.id === modelId);
  }

  // Function to update model dropdown based on API key presence
  function updateModelOptions(apiKey) {
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Always include free models when API key is present
    if (apiKey && apiKey.trim() !== '') {
      // Add a Free models group
      const freeGroup = document.createElement('optgroup');
      freeGroup.label = 'Free Models';
      
      freeModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        freeGroup.appendChild(option);
      });
      
      modelSelect.appendChild(freeGroup);
      
      // Add paid models with a clear separator
      if (paidModels.length > 0) {
        const paidGroup = document.createElement('optgroup');
        paidGroup.label = 'Paid Models (Cost Money)';
        
        paidModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          paidGroup.appendChild(option);
        });
        
        modelSelect.appendChild(paidGroup);
      }
    } else {
      // When no API key, inform user they need to enter one
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Enter API key to see models';
      placeholder.disabled = true;
      placeholder.selected = true;
      modelSelect.appendChild(placeholder);
    }
  }

  // Tab navigation functionality
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all tabs
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
  });

  // Get current URL and page content for context
  async function getCurrentPageInfo() {
    try {
      return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
          if (tabs && tabs[0]) {
            const activeTab = tabs[0];
            
            // Get the URL
            currentUrl = activeTab.url;
            
            // Get the page title
            pageTitle = activeTab.title || '';
            
            try {
              // Use the scripting API properly for Manifest V3
              const results = await chrome.scripting.executeScript({
                target: {tabId: activeTab.id},
                func: () => {
                  // Extract main content, focusing on article content if present
                  const article = document.querySelector('article');
                  const main = document.querySelector('main');
                  const body = document.body;
                  
                  // Try to get the most relevant content
                  let relevantElement = article || main || body;
                  
                  // Get text content, removing script tags and extra whitespace
                  let content = relevantElement.innerText
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  // Limit content length to avoid overloading the API
                  return content.substring(0, 15000);
                }
              });

              if (results && results[0] && results[0].result) {
                pageContent = results[0].result;
              }
              
              // Display URL context indicator
              if (document.getElementById('urlContextIndicator')) {
                const urlIndicator = document.getElementById('urlContextIndicator');
                urlIndicator.textContent = new URL(currentUrl).hostname;
                urlIndicator.title = currentUrl;
                urlIndicator.classList.remove('hidden');
              }
            } catch (scriptError) {
              console.error("Error executing content script:", scriptError);
              // Handle errors gracefully - this might happen if the tab is a privileged page
              showMessage('Cannot access page content (restricted page)', 'error');
            }
            
            resolve({url: currentUrl, title: pageTitle, content: pageContent});
          } else {
            resolve({url: null, title: null, content: null});
          }
        });
      });
    } catch (error) {
      console.error("Error getting current page info:", error);
      return {url: null, title: null, content: null};
    }
  }
  
  // Initialize: Get the current page info
  getCurrentPageInfo().then(info => {
    if (info.url) {
      console.log("Current URL for context:", info.url);
      console.log("Page title:", info.title);
      console.log("Page content length:", info.content ? info.content.length : 0);
    }
  });
  
  // Function to analyze the current page
  async function analyzePage(type) {
    // First check if API key exists
    chrome.storage.sync.get(['apiKey', 'model'], async (data) => {
      if (!data.apiKey) {
        showMessage('Please set your OpenRouter API key in settings', 'error');
        settingsPanel.classList.remove('hidden');
        return;
      }
      
      if (!data.model) {
        showMessage('Please select a model in settings', 'error');
        settingsPanel.classList.remove('hidden');
        return;
      }
      
      // Clear previous results and show loading state
      result.textContent = '';
      result.innerHTML = '<div class="loading">Analyzing page content...</div>';
      
      // Show result container
      resultContainer.style.display = 'block';
      
      // Hide action buttons until response is ready
      document.querySelectorAll('.result-actions button').forEach(btn => {
        btn.classList.add('hidden');
      });
      
      // Get latest page content
      try {
        await getCurrentPageInfo();
        
        if (!currentUrl || !pageContent) {
          showMessage('Unable to access page content. Make sure you are on a regular web page.', 'error');
          result.innerHTML = '';
          return;
        }
        
        let prompt = '';
        
        if (type === 'analyze') {
          prompt = `Analyze this web page and provide a comprehensive analysis including main topics, key points, and overall purpose. Page title: "${pageTitle}". Content: "${pageContent}"`;
        } else if (type === 'summarize') {
          prompt = `Summarize this web page in a concise paragraph. Focus on the main point and be brief but informative. Page title: "${pageTitle}". Content: "${pageContent}"`;
        } else if (type === 'keypoints') {
          prompt = `Extract the 5 most important key points from this web page as bullet points. Be concise and focus on the essential information. Page title: "${pageTitle}". Content: "${pageContent}"`;
        }
        
        await makeApiRequest(prompt, data.apiKey, data.model);
      } catch (error) {
        showMessage(`Error analyzing page: ${error.message}`, 'error');
        result.innerHTML = '';
      }
    });
  }
  
  // API request function (reused for both search and analysis)
  async function makeApiRequest(prompt, apiKey, modelId, temperature = 0.7) {
    try {
      // Build messages array with conversation history
      let messages = [];
      
      // Add system message based on the type of request
      if (prompt.includes('Analyze this web page') || prompt.includes('Summarize this web page') || prompt.includes('Extract the')) {
        messages.push({
          role: 'system',
          content: 'You are a helpful assistant specializing in web page analysis and summarization. Provide concise, accurate information extracted from web pages.'
        });
      } else {
        messages.push({
          role: 'system',
          content: 'You are a helpful assistant that maintains context from previous messages. Reference and build upon previous conversations when relevant. Be clear and direct while maintaining continuity.'
        });
      }
      
      // Add conversation history (up to last 5 exchanges) before the new prompt
      const recentHistory = conversationHistory.slice(-10);
      messages = messages.concat(recentHistory);
      
      // Add current user message
      messages.push({
        role: 'user',
        content: prompt
      });

      // Make API request
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/extension',
          'X-Title': 'AI Search Assistant'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: 2048,
          temperature: temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.statusText || JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
        const answer = responseData.choices[0].message.content;
        currentResponse = answer;
        currentQuery = prompt;
        
        // Save to conversation history
        conversationHistory.push({
          role: 'assistant',
          content: answer
        });
        
        // Format and display the response
        result.innerHTML = formatMarkdown(answer);
        
        // Show all action buttons
        document.querySelectorAll('.result-actions button').forEach(btn => {
          btn.classList.remove('hidden');
        });
        
        // Add or update context indicator
        if (conversationHistory.length > 2) {
          let contextIndicator = document.querySelector('.context-active');
          if (!contextIndicator) {
            contextIndicator = document.createElement('div');
            contextIndicator.className = 'context-active';
            contextIndicator.innerHTML = `
              <span class="material-icons">history</span>
              <span class="context-text">Conversation context active</span>
            `;
            result.parentNode.insertBefore(contextIndicator, result);
          }
        }
        
        // Add model info to the result
        const usedModel = responseData.model || modelId;
        const modelInfo = document.createElement('div');
        modelInfo.className = 'model-info';
        modelInfo.textContent = `Model: ${usedModel} ${isModelFree(usedModel) ? '(Free)' : ''}`;
        result.parentNode.insertBefore(modelInfo, result.nextSibling);
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Analyze button event listeners
  analyzePageBtn.addEventListener('click', () => {
    analyzePage('analyze');
  });
  
  summarizeBtn.addEventListener('click', () => {
    analyzePage('summarize');
  });
  
  keyPointsBtn.addEventListener('click', () => {
    analyzePage('keypoints');
  });
  
  // Load ElevenLabs voices
  async function fetchElevenLabsVoices(apiKey) {
    if (!apiKey) return;
    
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      
      const data = await response.json();
      availableElevenLabsVoices = data.voices || [];
      
      // Populate voice dropdown
      elevenLabsVoiceSelect.innerHTML = '';
      
      if (availableElevenLabsVoices.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No voices available';
        option.disabled = true;
        option.selected = true;
        elevenLabsVoiceSelect.appendChild(option);
      } else {
        availableElevenLabsVoices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.voice_id;
          option.textContent = voice.name;
          elevenLabsVoiceSelect.appendChild(option);
        });
      }
      
      return availableElevenLabsVoices;
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      showMessage(`Error loading voices: ${error.message}`, 'error');
      return [];
    }
  }
  
  // Text to speech with ElevenLabs
  async function speakWithElevenLabs(text, voiceId, apiKey) {
    if (!text || !voiceId || !apiKey) return;
    
    try {
      // Show loading state
      const speakBtn = document.getElementById('speakBtn');
      speakBtn.disabled = true;
      speakBtn.querySelector('span').textContent = 'pending';
      speakBtn.classList.add('speaking');
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      // Convert response to blob and play audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioPlayer.src = audioUrl;
      audioPlayer.play();
      
      // Set playing state
      isPlaying = true;
      speakBtn.querySelector('span').textContent = 'stop';
      
      // Clean up when audio playback ends
      audioPlayer.onended = () => {
        isPlaying = false;
        speakBtn.disabled = false;
        speakBtn.querySelector('span').textContent = 'volume_up';
        speakBtn.classList.remove('speaking');
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      showMessage(`Speech generation error: ${error.message}`, 'error');
      
      // Reset button state
      const speakBtn = document.getElementById('speakBtn');
      speakBtn.disabled = false;
      speakBtn.querySelector('span').textContent = 'volume_up';
      speakBtn.classList.remove('speaking');
    }
  }
  
  // Test ElevenLabs voice
  testVoiceBtn.addEventListener('click', async () => {
    const apiKey = elevenLabsKeyInput.value.trim();
    const voiceId = elevenLabsVoiceSelect.value;
    
    if (!apiKey) {
      showMessage('Please enter your ElevenLabs API key', 'error');
      return;
    }
    
    if (!voiceId) {
      showMessage('Please select a voice', 'error');
      return;
    }
    
    // Test with a sample phrase
    await speakWithElevenLabs('Hello, this is a test of my voice with ElevenLabs!', voiceId, apiKey);
  });
  
  // Watch for ElevenLabs API key input to load voices
  elevenLabsKeyInput.addEventListener('change', async () => {
    const apiKey = elevenLabsKeyInput.value.trim();
    if (apiKey) {
      await fetchElevenLabsVoices(apiKey);
    }
  });
  
  // Load saved settings
  chrome.storage.sync.get([
    'apiKey', 
    'model', 
    'freeModelOnly', 
    'useUrlContext', 
    'temperature',
    'elevenLabsKey',
    'elevenLabsVoice',
    'useElevenLabs'
  ], async (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    
    // Set URL context toggle if saved
    if (data.useUrlContext !== undefined) {
      isUseUrlContext = data.useUrlContext;
      if (isUseUrlContext) {
        urlModeBtn.classList.add('active');
        basicModeBtn.classList.remove('active');
      } else {
        basicModeBtn.classList.add('active');
        urlModeBtn.classList.remove('active');
      }
    }
    
    // Set temperature if saved
    if (data.temperature !== undefined && document.getElementById('temperature')) {
      document.getElementById('temperature').value = data.temperature;
      document.getElementById('temperatureValue').textContent = data.temperature;
    }
    
    // Initialize model dropdown
    updateModelOptions(data.apiKey);
    
    // Set selected model if it exists
    if (data.apiKey && data.model) {
      // If "free model only" setting is enabled or model doesn't exist in our lists,
      // default to a free model
      if (data.freeModelOnly === true && !isModelFree(data.model)) {
        // Default to first free model
        if (freeModels.length > 0) {
          modelSelect.value = freeModels[0].id;
        }
      } else if ([...freeModels, ...paidModels].some(model => model.id === data.model)) {
        modelSelect.value = data.model;
      } else {
        // If saved model is not in current lists, default to first free model if available
        modelSelect.value = freeModels.length > 0 ? freeModels[0].id : '';
      }
    }
    
    // Set ElevenLabs settings if saved
    if (data.elevenLabsKey) {
      elevenLabsKeyInput.value = data.elevenLabsKey;
      await fetchElevenLabsVoices(data.elevenLabsKey);
      
      if (data.elevenLabsVoice) {
        setTimeout(() => {
          elevenLabsVoiceSelect.value = data.elevenLabsVoice;
        }, 500); // Give time for voices to load
      }
    }
    
    if (data.useElevenLabs !== undefined) {
      useElevenLabsToggle.checked = data.useElevenLabs;
    }
  });
  
  // Toggle URL context feature
  if (document.getElementById('urlContextToggle')) {
    document.getElementById('urlContextToggle').addEventListener('change', (e) => {
      isUseUrlContext = e.target.checked;
      chrome.storage.sync.set({ useUrlContext: isUseUrlContext });
    });
  }
  
  // Temperature slider handler
  if (document.getElementById('temperature')) {
    document.getElementById('temperature').addEventListener('input', (e) => {
      const tempValue = e.target.value;
      document.getElementById('temperatureValue').textContent = tempValue;
      chrome.storage.sync.set({ temperature: tempValue });
    });
  }

  // Watch for API key changes to update models in real time
  apiKeyInput.addEventListener('input', () => {
    updateModelOptions(apiKeyInput.value);
  });

  // Toggle settings panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Save settings
  saveSettingsBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    
    // Get additional settings
    const temperature = document.getElementById('temperature') ? 
      parseFloat(document.getElementById('temperature').value) : 0.7;
    
    // Get ElevenLabs settings
    const elevenLabsKey = elevenLabsKeyInput.value.trim();
    const elevenLabsVoice = elevenLabsVoiceSelect.value;
    const useElevenLabs = useElevenLabsToggle.checked;
    
    // Default to free model only for safety
    const freeModelOnly = true;

    if (!apiKey) {
      showMessage('Please enter your OpenRouter API key', 'error');
      return;
    }
    
    if (!model) {
      showMessage('Please select a model', 'error');
      return;
    }

    // Verify user isn't using a paid model with free-only setting
    if (freeModelOnly && !isModelFree(model)) {
      showMessage('Only free models are allowed. Selecting a free model for you.', 'error');
      // Select first free model
      if (freeModels.length > 0) {
        modelSelect.value = freeModels[0].id;
      }
      return;
    }

    // Optional: Validate API key with a lightweight request
    try {
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.textContent = 'Verifying...';
      
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid API key');
      }
      
      // Validate ElevenLabs key if provided
      if (elevenLabsKey && useElevenLabs) {
        try {
          const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
              'xi-api-key': elevenLabsKey
            }
          });
          
          if (!elevenlabsResponse.ok) {
            throw new Error('Invalid ElevenLabs API key');
          }
        } catch (error) {
          throw new Error(`ElevenLabs API error: ${error.message}`);
        }
      }
      
      // Save all settings if valid
      chrome.storage.sync.set({ 
        apiKey, 
        model: modelSelect.value,
        freeModelOnly,
        useUrlContext: isUseUrlContext,
        temperature,
        elevenLabsKey,
        elevenLabsVoice,
        useElevenLabs
      }, () => {
        showMessage('Settings saved successfully!', 'success');
        settingsPanel.classList.add('hidden');
      });
    } catch (error) {
      showMessage(`Error validating API key: ${error.message}`, 'error');
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = 'Save Settings';
    }
  });

  // Handle search
  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    currentQuery = query;
    
    if (!query) {
      showMessage('Please enter a question', 'error');
      return;
    }

    // Get API key and model from storage
    chrome.storage.sync.get(['apiKey', 'model', 'freeModelOnly', 'temperature'], async (data) => {
      if (!data.apiKey) {
        showMessage('Please set your OpenRouter API key in settings', 'error');
        settingsPanel.classList.remove('hidden');
        return;
      }
      
      if (!data.model) {
        showMessage('Please select a model in settings', 'error');
        settingsPanel.classList.remove('hidden');
        return;
      }
      
      // FAILSAFE: Check if the model is free if freeModelOnly is enabled
      let modelToUse = data.model;
      if (data.freeModelOnly === true && !isModelFree(data.model)) {
        // Force use a free model instead
        modelToUse = freeModels.length > 0 ? freeModels[0].id : 'openrouter/auto';
        showMessage(`Switched to free model (${modelToUse}) to avoid charges`, 'success');
      }
      
      // Get temperature setting
      const temperature = data.temperature !== undefined ? 
        parseFloat(data.temperature) : 0.7;

      searchBtn.disabled = true;
      searchBtn.textContent = 'Searching...';
      result.textContent = '';
      
      // Hide action buttons until response is ready
      document.querySelectorAll('.result-actions button').forEach(btn => {
        btn.classList.add('hidden');
      });

      try {
        // Build the prompt
        let userMessage = query;
        if (isUseUrlContext && currentUrl) {
          userMessage = `[Current page: ${pageTitle} (${currentUrl})] ${query}`;
        }
        
        await makeApiRequest(userMessage, data.apiKey, modelToUse, temperature);
      } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
      } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
      }
    });
  });

  // Format markdown content
  function formatMarkdown(text) {
    if (!text) return '';
    
    // Replace code blocks
    text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
      const language = code.split('\n')[0];
      const actualCode = language ? code.substring(language.length).trim() : code;
      return `<pre class="code-block"><code>${escapeHtml(actualCode)}</code></pre>`;
    });
    
    // Bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Lists
    text = text.replace(/^\s*[\*\-]\s+(.*)/gm, '<li>$1</li>').replace(/<\/li>\n<li>/g, '</li><li>');
    text = text.replace(/((<li>.*<\/li>)+)/g, '<ul>$1</ul>');
    
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Copy result
  copyBtn.addEventListener('click', () => {
    const textToCopy = currentResponse;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showMessage('Response copied to clipboard', 'success');
    }).catch(() => {
      showMessage('Failed to copy response', 'error');
    });
  });
  
  // Download result as text file
  if (document.getElementById('downloadBtn')) {
    document.getElementById('downloadBtn').addEventListener('click', () => {
      if (!currentResponse) return;
      
      // Create text file from response
      const blob = new Blob([currentResponse], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Generate filename based on first few words of query
      const filename = `ai-response-${currentQuery.slice(0, 20).replace(/\W+/g, '-')}.txt`;
      
      // Create download link and trigger it
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      showMessage('Downloaded response as text file', 'success');
    });
  }
  
  // Share result
  if (document.getElementById('shareBtn')) {
    document.getElementById('shareBtn').addEventListener('click', async () => {
      if (!currentResponse || !currentQuery) return;
      
      try {
        // Format content for sharing
        const shareText = `Q: ${currentQuery}\n\nA: ${currentResponse}`;
        
        // Try to use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: 'AI Search Assistant Response',
            text: shareText
          });
          showMessage('Shared successfully!', 'success');
        } else {
          // Fallback to copy to clipboard
          navigator.clipboard.writeText(shareText).then(() => {
            showMessage('Content copied for sharing', 'success');
          });
        }
      } catch (error) {
        showMessage('Failed to share content', 'error');
      }
    });
  }
  
  // Text-to-speech
  if (document.getElementById('speakBtn')) {
    document.getElementById('speakBtn').addEventListener('click', async () => {
      if (!currentResponse) return;
      
      // If already playing, stop playback
      if (isPlaying) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isPlaying = false;
        document.getElementById('speakBtn').querySelector('span').textContent = 'volume_up';
        document.getElementById('speakBtn').classList.remove('speaking');
        return;
      }
      
      // Check if we should use ElevenLabs
      chrome.storage.sync.get(['useElevenLabs', 'elevenLabsKey', 'elevenLabsVoice'], async (data) => {
        if (data.useElevenLabs && data.elevenLabsKey && data.elevenLabsVoice) {
          // Use ElevenLabs for TTS
          await speakWithElevenLabs(currentResponse, data.elevenLabsVoice, data.elevenLabsKey);
        } else {
          // Use browser's built-in TTS as fallback
          // Stop any ongoing speech
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            return;
          }
          
          // Create and configure utterance
          const utterance = new SpeechSynthesisUtterance(currentResponse);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          // Get available voices and select a good one
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            // Try to find a good quality voice
            const preferredVoice = voices.find(voice => 
              voice.name.includes('Google') || 
              voice.name.includes('Premium') || 
              voice.lang === 'en-US');
              
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
          }
          
          // Add visual feedback during speech
          document.getElementById('speakBtn').classList.add('speaking');
          
          // Handle speech events
          utterance.onstart = () => {
            isPlaying = true;
            document.getElementById('speakBtn').querySelector('span').textContent = 'stop';
          };
          
          utterance.onend = () => {
            isPlaying = false;
            document.getElementById('speakBtn').querySelector('span').textContent = 'volume_up';
            document.getElementById('speakBtn').classList.remove('speaking');
          };
          
          // Speak the text
          window.speechSynthesis.speak(utterance);
          showMessage('Text-to-speech started', 'success');
        }
      });
    });
  }

  // Handle Enter key in textarea
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchBtn.click();
    }
  });

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = 'message';
    }, 3000);
  }

  // Voice input functionality
  let recognition;
  let isRecording = false;

  function initializeVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceInputBtn.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecording = true;
      voiceInputBtn.classList.add('recording');
      voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
      showMessage('Listening...', 'success');
    };

    recognition.onend = () => {
      isRecording = false;
      voiceInputBtn.classList.remove('recording');
      voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      searchInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      voiceInputBtn.classList.remove('recording');
      voiceInputBtn.querySelector('.material-icons').textContent = 'mic';
      
      let errorMessage = 'An error occurred with voice recognition';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Please allow microphone access to use voice input';
          break;
        case 'no-speech':
          errorMessage = 'No speech was detected. Please try again.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone was found. Please check your device settings.';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      showMessage(errorMessage, 'error');
    };
  }

  // Initialize voice recognition
  initializeVoiceRecognition();

  // Voice input button click handler
  voiceInputBtn.addEventListener('click', () => {
    if (!recognition) {
      showMessage('Speech recognition is not supported in your browser', 'error');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      searchInput.value = ''; // Clear existing input
      recognition.start();
    }
  });

  // Reset button click handler
  document.getElementById('resetBtn').addEventListener('click', () => {
    // Stop voice recognition if active
    if (isRecording && recognition) {
      recognition.stop();
    }
    
    // Clear input
    searchInput.value = '';
    
    // Clear results
    result.innerHTML = '';
    resultContainer.style.display = 'none';
    
    // Hide all action buttons
    document.querySelectorAll('.result-actions button').forEach(btn => {
      btn.classList.add('hidden');
    });
    
    // Reset current response, query and conversation history
    currentResponse = '';
    currentQuery = '';
    conversationHistory = [];
    
    // Remove context indicator if it exists
    const contextIndicator = document.querySelector('.context-active');
    if (contextIndicator) {
      contextIndicator.remove();
    }
    
    showMessage('Conversation and results cleared', 'success');
  });
});
