// Initialize extension
console.log("AI Search Assistant background script initialized");

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get the active tab to interact with content script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      sendResponse({error: "No active tab found", success: false});
      return;
    }
    
    // Forward the request to content script
    chrome.tabs.sendMessage(tabs[0].id, request)
      .then(response => {
        if (chrome.runtime.lastError) {
          sendResponse({error: chrome.runtime.lastError, success: false});
        } else {
          sendResponse(response);
        }
      })
      .catch(error => {
        console.error('Error in background script:', error);
        sendResponse({error: error.message, success: false});
      });
  });
  
  return true; // Required for async response
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed");
  } else if (details.reason === "update") {
    console.log("Extension updated");
  }
});

// Context menu integration
chrome.contextMenus.create({
  id: "aiSearchAssistant",
  title: "AI Search Assistant",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "aiSearchAssistant" && info.selectionText) {
    // Send selected text to popup for analysis
    chrome.runtime.sendMessage({
      action: "analyzeSelection",
      text: info.selectionText
    });
  }
});
