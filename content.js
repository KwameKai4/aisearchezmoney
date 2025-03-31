// Listen for messages from the popup
console.log("AI Search Assistant content script initialized");

function extractPageText() {
  // Get all text content from visible elements
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section, div');
  let text = '';
  elements.forEach(el => {
    // Only include text that is actually visible
    if (el.offsetParent !== null) {
      const content = el.innerText.trim();
      if (content) text += content + '\n\n';
    }
  });
  return text.trim();
}

function extractKeyPointsFromText(text) {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  // Find sentences that likely contain key information
  return sentences
    .filter(s => {
      const lower = s.toLowerCase();
      return (
        lower.includes('important') ||
        lower.includes('key') ||
        lower.includes('main') ||
        lower.includes('significant') ||
        lower.startsWith('the most') ||
        lower.startsWith('primarily') ||
        lower.includes('essential')
      );
    })
    .map(s => s.trim())
    .slice(0, 5); // Limit to top 5 key points
}

// Function to perform basic search without URL context
async function performBasicSearch(query) {
  try {
    // Use OpenAI API for search with query only
    const { apiKey, model } = await chrome.storage.sync.get(['apiKey', 'model']);
    
    if (!apiKey) {
      return {
        data: 'Error: OpenRouter API key is required. Please add it in settings.',
        success: false
      };
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Search Assistant'
      },
      body: JSON.stringify({
        model: model || 'mistralai/mistral-7b-instruct:free',
        messages: [
          { 
            role: "user", 
            content: `Please answer the following question as accurately as possible: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API request failed');
    }
    
    const result = await response.json();
    const answer = result.choices[0].message.content;
    
    return {
      data: answer,
      success: true
    };
  } catch (error) {
    console.error('Basic search error:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'getPageContent':
        const pageContent = extractPageText();
        sendResponse({ 
          data: pageContent,
          title: document.title,
          success: true
        });
        break;

      case 'analyzePage':
        const analysis = {
          title: document.title,
          url: window.location.href,
          wordCount: extractPageText().split(/\s+/).length,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()),
          links: Array.from(document.querySelectorAll('a')).length,
          images: Array.from(document.querySelectorAll('img')).length
        };
        sendResponse({ data: JSON.stringify(analysis, null, 2), success: true });
        break;

      case 'summarize':
        const textToSummarize = extractPageText();
        // Get first paragraph and last paragraph as simple summary
        const paragraphs = textToSummarize.split('\n\n').filter(p => p.length > 50);
        const summary = paragraphs.length > 1 
          ? paragraphs[0] + '\n\n...\n\n' + paragraphs[paragraphs.length - 1]
          : paragraphs[0];
        sendResponse({ data: summary, success: true });
        break;

      case 'keyPoints':
        const keyPoints = extractKeyPointsFromText(extractPageText());
        const formattedPoints = keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n\n');
        sendResponse({ 
          data: formattedPoints || 'No key points identified.',
          success: true 
        });
        break;

      case 'search':
        // Check if we should use URL context or basic search
        if (message.useUrlContext) {
          // URL context search in the current page
          const searchText = extractPageText();
          const query = message.query.toLowerCase();
          const matches = searchText
            .split('\n')
            .filter(line => line.toLowerCase().includes(query))
            .slice(0, 5);
          
          sendResponse({
            data: matches.length 
              ? 'Search Results from Current Page:\n\n' + matches.join('\n\n')
              : 'No matches found on this page for: ' + message.query,
            success: true
          });
        } else {
          // Basic search without URL context
          performBasicSearch(message.query).then(response => {
            sendResponse(response);
          }).catch(error => {
            sendResponse({
              error: error.message,
              success: false
            });
          });
          return true; // Signal that we will send the response asynchronously
        }
        break;

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  } catch (error) {
    console.error('Error in content script:', error);
    sendResponse({ error: error.message, success: false });
  }
  return true; // Required for async response
});
