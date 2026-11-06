// Udemy Translator - Background Service Worker
// Xử lý dịch thuật Google Translate API không lo bị vướng CSP/CORS từ trang Udemy
// Bản quyền tiện ích được tạo bởi Dev yanfeii_9999

const translationCache = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("Udemy Translator (Bản quyền tiện ích được tạo bởi Dev yanfeii_9999) đã được cài đặt thành công!");

  // Thiết lập cài đặt mặc định
  chrome.storage.local.get(["autoTranslate", "bilingual", "fontSize"], (result) => {
    const defaults = {
      autoTranslate: result.autoTranslate !== undefined ? result.autoTranslate : true,
      bilingual: result.bilingual !== undefined ? result.bilingual : false,
      fontSize: result.fontSize || "medium"
    };
    chrome.storage.local.set(defaults);
  });
});

// Lắng nghe yêu cầu dịch từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const text = (request.text || "").trim();
    if (!text) {
      sendResponse({ success: false, translated: "" });
      return false;
    }

    if (translationCache.has(text)) {
      sendResponse({ success: true, translated: translationCache.get(text), fromCache: true });
      return false;
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((data) => {
        let translatedText = "";
        if (data && data[0]) {
          for (const item of data[0]) {
            if (item && item[0]) {
              translatedText += item[0];
            }
          }
        }
        translatedText = translatedText.trim();
        if (translatedText) {
          // Lưu cache (tối đa 3000 câu để tiết kiệm RAM)
          if (translationCache.size > 3000) {
            const firstKey = translationCache.keys().next().value;
            translationCache.delete(firstKey);
          }
          translationCache.set(text, translatedText);
        }
        sendResponse({ success: true, translated: translatedText || text });
      })
      .catch((err) => {
        console.error("Lỗi dịch Google Translate:", err);
        sendResponse({ success: false, error: err.message, translated: text });
      });

    return true; // Giữ kết nối asynchronous cho sendResponse
  }
});
