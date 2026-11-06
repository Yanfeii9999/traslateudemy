// Udemy Translator - Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const translateCheckbox = document.getElementById("autoTranslate");
  const bilingualCheckbox = document.getElementById("bilingual");
  const fontSizeSelect = document.getElementById("fontSize");

  // Đọc cài đặt đã lưu
  chrome.storage.local.get(["autoTranslate", "bilingual", "fontSize"], (items) => {
    if (items.autoTranslate !== undefined) translateCheckbox.checked = items.autoTranslate;
    if (items.bilingual !== undefined) bilingualCheckbox.checked = items.bilingual;
    if (items.fontSize !== undefined) fontSizeSelect.value = items.fontSize;
  });

  // Lưu cài đặt khi thay đổi
  translateCheckbox.addEventListener("change", (e) => {
    chrome.storage.local.set({ autoTranslate: e.target.checked });
  });

  bilingualCheckbox.addEventListener("change", (e) => {
    chrome.storage.local.set({ bilingual: e.target.checked });
  });

  fontSizeSelect.addEventListener("change", (e) => {
    chrome.storage.local.set({ fontSize: e.target.value });
  });
});
