// Background script for AI Search Assistant extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.sync.set({
      useUrlContext: true,
      temperature: 0.7
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extractContent') {
    // Forward the message to the active tab's content script
    const tabId = message.tabId || (sender.tab && sender.tab.id);
    
    if (!tabId) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          try {
            // First try direct messaging to content script
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' })
              .then(response => {
                sendResponse(response);
              })
              .catch(async () => {
                // If that fails, inject and execute a script directly
                try {
                  const results = await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: () => {
                      return {
                        content: document.body.innerText,
                        title: document.title,
                        success: true
                      };
                    }
                  });
                  
                  if (results && results[0]) {
                    sendResponse(results[0].result);
                  } else {
                    sendResponse({ error: 'Failed to extract content', success: false });
                  }
                } catch (error) {
                  console.error('Error executing script:', error);
                  sendResponse({ error: error.message, success: false });
                }
              });
          } catch (error) {
            console.error('Error sending message to content script:', error);
            sendResponse({ error: error.message, success: false });
          }
        } else {
          sendResponse({ error: 'No active tab found', success: false });
        }
      });
    } else {
      // If we have a tab ID already, use it directly
      try {
        chrome.tabs.sendMessage(tabId, { action: 'getPageContent' })
          .then(response => {
            sendResponse(response);
          })
          .catch(error => {
            console.error('Error sending message to content script:', error);
            sendResponse({ error: 'Could not extract content', success: false });
          });
      } catch (error) {
        console.error('Error in tab communication:', error);
        sendResponse({ error: error.message, success: false });
      }
    }
    
    return true; // Required for async response
  }
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();
