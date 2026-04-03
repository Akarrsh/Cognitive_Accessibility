// Background service worker for handling external API calls to the local Ollama instance
// This avoids CORS issues that occur if we try to call localhost from a third-party webpage.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchOllama") {
    // Send request to localhost Ollama asynchronously
    fetchOllamaAPI(request.text)
      .then(response => sendResponse({ success: true, text: response }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
      
    return true; // Keep the message channel open for async response
  }
});

async function fetchOllamaAPI(text) {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3", // Assuming user has llama3 loaded
        prompt: `Please rewrite the following text to be extremely simple to understand, use short sentences, and reduce jargon to an 8th-grade reading level. Keep the core facts:\n\n${text}`,
        stream: false
      })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.response;
  } catch (error) {
    console.error("Ollama connection failed:", error);
    throw error;
  }
}
