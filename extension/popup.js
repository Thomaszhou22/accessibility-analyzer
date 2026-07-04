// Popup script for AccessScan Extension

document.addEventListener('DOMContentLoaded', () => {
  const scanButton = document.getElementById('scanButton');
  const loadingSection = document.getElementById('loadingSection');
  const resultsSection = document.getElementById('resultsSection');
  const errorSection = document.getElementById('errorSection');
  const currentUrlDisplay = document.getElementById('currentUrl');
  const errorMessage = document.getElementById('errorMessage');
  
  // Score panel elements
  const scoreCircle = document.getElementById('scoreCircle');
  const scoreLabel = document.getElementById('scoreLabel');
  const errorCount = document.getElementById('errorCount');
  const warningCount = document.getElementById('warningCount');
  const totalCount = document.getElementById('totalCount');
  const issuesList = document.getElementById('issuesList');
  const fullReportLink = document.getElementById('fullReportLink');
  
  let currentTabUrl = '';
  let currentTabId = null;
  
  // Get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      currentTabUrl = tab.url || '';
      currentTabId = tab.id;
      currentUrlDisplay.textContent = currentTabUrl;
      
      // Disable button for chrome:// URLs
      if (currentTabUrl.startsWith('chrome://') || currentTabUrl.startsWith('chrome-extension://')) {
        scanButton.disabled = true;
        scanButton.textContent = 'Cannot scan browser pages';
      }
    }
  });
  
  // Scan button click handler
  scanButton.addEventListener('click', async () => {
    try {
      // Show loading state
      scanButton.disabled = true;
      loadingSection.classList.remove('hidden');
      resultsSection.classList.add('hidden');
      errorSection.classList.add('hidden');
      
      // Inject content script and get HTML
      const html = await getPageHtml(currentTabId);
      
      // Parse HTML and run accessibility scan
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Run the scan using rules.js (loaded in popup.html)
      const result = scanDocument(doc);
      
      // Display results
      displayResults(result, currentTabUrl);
      
    } catch (error) {
      console.error('Scan failed:', error);
      showError(error.message || 'Failed to scan page');
    } finally {
      scanButton.disabled = false;
      loadingSection.classList.add('hidden');
    }
  });
  
  // Get page HTML via content script
  async function getPageHtml(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'getPageHtml' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not injected, inject it now
          chrome.scripting.executeScript(
            {
              target: { tabId: tabId },
              files: ['content.js']
            },
            () => {
              if (chrome.runtime.lastError) {
                reject(new Error('Failed to inject content script'));
                return;
              }
              
              // Retry getting HTML after injection
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'getPageHtml' }, (retryResponse) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error('Failed to get page HTML'));
                  } else if (retryResponse && retryResponse.html) {
                    resolve(retryResponse.html);
                  } else {
                    reject(new Error('Invalid response from content script'));
                  }
                });
              }, 100);
            }
          );
        } else if (response && response.html) {
          resolve(response.html);
        } else {
          reject(new Error('Invalid response from content script'));
        }
      });
    });
  }
  
  // Display scan results
  function displayResults(result, url) {
    const { score, errors, warnings, totalIssues, issues } = result;
    
    // Update score circle
    scoreCircle.textContent = score;
    scoreCircle.className = 'score-circle';
    
    if (score >= 90) {
      scoreCircle.classList.add('score-excellent');
      scoreLabel.textContent = 'Excellent';
    } else if (score >= 70) {
      scoreCircle.classList.add('score-good');
      scoreLabel.textContent = 'Good';
    } else if (score >= 50) {
      scoreCircle.classList.add('score-needs-work');
      scoreLabel.textContent = 'Needs Work';
    } else {
      scoreCircle.classList.add('score-poor');
      scoreLabel.textContent = 'Poor';
    }
    
    // Update stats
    errorCount.textContent = errors;
    warningCount.textContent = warnings;
    totalCount.textContent = totalIssues;
    
    // Display top 5 issues
    issuesList.innerHTML = '';
    const topIssues = issues.slice(0, 5);
    
    if (topIssues.length === 0) {
      issuesList.innerHTML = '<div style="color: #10b981; text-align: center; padding: 16px;">No accessibility issues found!</div>';
    } else {
      topIssues.forEach((issue) => {
        const issueDiv = document.createElement('div');
        issueDiv.className = `issue-item issue-${issue.level}`;
        
        issueDiv.innerHTML = `
          <div class="issue-title">${escapeHtml(issue.title)}</div>
          <div class="issue-description">${escapeHtml(issue.description)}</div>
        `;
        
        issuesList.appendChild(issueDiv);
      });
      
      if (issues.length > 5) {
        const moreDiv = document.createElement('div');
        moreDiv.style.textAlign = 'center';
        moreDiv.style.padding = '8px';
        moreDiv.style.color = '#6b7280';
        moreDiv.style.fontSize = '12px';
        moreDiv.textContent = `+ ${issues.length - 5} more issues`;
        issuesList.appendChild(moreDiv);
      }
    }
    
    // Update full report link
    const vercelUrl = `https://accessibility-analyzer.vercel.app/?url=${encodeURIComponent(url)}`;
    fullReportLink.href = vercelUrl;
    
    // Show results section
    resultsSection.classList.remove('hidden');
  }
  
  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
