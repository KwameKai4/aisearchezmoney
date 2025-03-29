// Initialize extension and set up message handlers
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Search Assistant installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'extractContent') {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      function: () => {
        const content = document.body.innerText;
        return { content, title: document.title };
      }
    }).then(results => {
      if (results && results[0]) {
        sendResponse(results[0].result);
      }
    });
    return true; // Will respond asynchronously
  }
});
