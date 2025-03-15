chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentUrl") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        sendResponse({ url: currentTab.url });
      } else {
        sendResponse({ url: null });
      }
    });
    return true; // Required for async sendResponse
  }
});

// This listener allows the popup to open without clicking the icon
chrome.action.onClicked.addListener((tab) => {
  // The popup is set as the default action, so this is just a fallback
});
