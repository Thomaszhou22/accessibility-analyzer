// Content script for AccessScan Extension
// Injected into web pages to extract HTML

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageHtml') {
    try {
      const html = document.documentElement.outerHTML;
      sendResponse({ html: html });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  return true; // Keep message channel open for async response
});
