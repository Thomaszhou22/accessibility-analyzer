// Background service worker for AccessScan Extension
// Coordinates messages between popup and content scripts

chrome.runtime.onInstalled.addListener(() => {
  console.log('AccessScan Extension installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanPage') {
    // Forward scan request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep message channel open
  }
});
