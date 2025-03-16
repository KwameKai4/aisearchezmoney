// Listen for messages from the popup
console.log("AI Search Assistant content script initialized");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageContent') {
    try {
      // Extract readable content from the page
      const pageContent = document.body.innerText;
      const title = document.title;
      
      // Send the extracted content back
      sendResponse({ 
        content: pageContent,
        title: title,
        success: true
      });
    } catch (error) {
      console.error('Error extracting page content:', error);
      sendResponse({ error: error.message, success: false });
    }
  }
  return true; // Required for async response
});