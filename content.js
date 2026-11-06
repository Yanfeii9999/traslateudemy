// Udemy Translator - Content Script
// Chuyên dụng: Tự động dịch phụ đề Udemy sang Tiếng Việt (Hỗ trợ đơn ngữ & song ngữ)
// Bản quyền tiện ích được tạo bởi Dev yanfeii_9999

(function () {
  'use strict';

  if (window.__UDEMY_TRANSLATOR_INITIALIZED__) return;
  window.__UDEMY_TRANSLATOR_INITIALIZED__ = true;

  console.log("%c[Udemy Translator] Tiện ích dịch phụ đề Tiếng Việt - Bản quyền tiện ích được tạo bởi Dev yanfeii_9999", "color: #10b981; font-weight: bold; font-size: 13px;");

  // ==========================================
  // 1. CẤU HÌNH & TRẠNG THÁI
  // ==========================================
  let config = {
    autoTranslate: true,
    bilingual: false,
    fontSize: "medium" // small, medium, large
  };

  let currentCueText = "";
  let lastProcessedUrl = window.location.href;

  // Hộp hiển thị phụ đề dịch
  const subBox = document.createElement("div");
  subBox.id = "udemy-translator-sub-box";
  subBox.className = "hidden font-medium";
  subBox.innerHTML = `
    <div class="udemy-sub-vi"></div>
    <div class="udemy-sub-en" style="display: none;"></div>
  `;

  // Lấy cài đặt từ storage
  chrome.storage.local.get(["autoTranslate", "bilingual", "fontSize"], (items) => {
    config = { ...config, ...items };
    applySettings();
  });

  // Lắng nghe thay đổi cài đặt từ Popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      for (const [key, { newValue }] of Object.entries(changes)) {
        config[key] = newValue;
      }
      applySettings();
    }
  });

  function applySettings() {
    // Ẩn/hiện phụ đề gốc
    if (config.autoTranslate && !config.bilingual) {
      document.body.classList.add("udemy-hide-native-caption");
    } else {
      document.body.classList.remove("udemy-hide-native-caption");
    }

    // Cỡ chữ
    subBox.classList.remove("font-small", "font-medium", "font-large");
    subBox.classList.add(`font-${config.fontSize || "medium"}`);

    if (!config.autoTranslate) {
      subBox.classList.add("hidden");
    }
  }

  // ==========================================
  // 2. GẮN HỘP PHỤ ĐỀ VÀO VIDEO PLAYER
  // ==========================================
  function ensureSubtitleBoxMounted() {
    const videoContainer = document.querySelector(
      ".video-player--container--3y_fA, .video-player-container, [data-purpose='video-player'], .vjs-tech, .video-player--video-player--1cO1u"
    ) || document.body;

    if (videoContainer && !videoContainer.contains(subBox)) {
      videoContainer.appendChild(subBox);
    }
  }

  // ==========================================
  // 3. TỰ ĐỘNG BẬT CAPTION GỐC NẾU CHƯA BẬT
  // ==========================================
  function autoEnableCaptions() {
    const ccBtn = document.querySelector(
      'button[data-purpose="captions-dropdown-button"], button[aria-label*="Captions"], button[aria-label*="Phụ đề"]'
    );
    if (ccBtn) {
      const isPressed = ccBtn.getAttribute("aria-pressed") === "true";
      const isExpanded = ccBtn.getAttribute("aria-expanded") === "true";
      const text = ccBtn.innerText || "";

      if (!isPressed && !isExpanded && (text.includes("Off") || !document.querySelector("[data-purpose='captions-cue-text']"))) {
        console.log("[Udemy Translator] Tự động kích hoạt CC phụ đề...");
        ccBtn.click();
        setTimeout(() => {
          const enOption = Array.from(document.querySelectorAll("[role='menuitemradio'], [role='menuitem']"))
            .find(el => el.innerText && (el.innerText.includes("English") || el.innerText.includes("Tiếng Anh")));
          if (enOption) {
            enOption.click();
          } else {
            ccBtn.click(); // đóng lại menu nếu không thấy
          }
        }, 300);
      }
    }
  }

  // ==========================================
  // 4. QUÉT & DỊCH PHỤ ĐỀ REALTIME
  // ==========================================
  function observeCaptions() {
    ensureSubtitleBoxMounted();

    const captionElements = document.querySelectorAll(
      '[data-purpose="captions-cue-text"], [data-purpose="cue-text"], [class*="captions-display--captions-cue-text"]'
    );

    let text = "";
    if (captionElements.length > 0) {
      text = Array.from(captionElements).map(el => el.innerText.trim()).filter(Boolean).join(" ");
    }

    if (text && text !== currentCueText) {
      currentCueText = text;
      handleNewCaption(text);
    } else if (!text && currentCueText) {
      currentCueText = "";
      subBox.classList.add("hidden");
    }
  }

  function handleNewCaption(originalText) {
    if (!config.autoTranslate) {
      subBox.classList.add("hidden");
      return;
    }

    chrome.runtime.sendMessage({ action: "translate", text: originalText }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[Udemy Translator] Lỗi gửi tin nhắn dịch:", chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success && response.translated) {
        ensureSubtitleBoxMounted();
        const viEl = subBox.querySelector(".udemy-sub-vi");
        const enEl = subBox.querySelector(".udemy-sub-en");

        viEl.textContent = response.translated;

        if (config.bilingual) {
          enEl.textContent = originalText;
          enEl.style.display = "block";
        } else {
          enEl.style.display = "none";
        }

        subBox.classList.remove("hidden");
      }
    });
  }

  // ==========================================
  // 5. THEO DÕI VỚI MUTATION OBSERVER & INTERVAL
  // ==========================================
  // Dùng MutationObserver để bắt phụ đề thay đổi ngay lập tức (không trễ)
  let captionObserver = null;
  function setupCaptionObserver() {
    if (captionObserver) captionObserver.disconnect();

    captionObserver = new MutationObserver(() => {
      observeCaptions();
    });

    const target = document.querySelector(".video-player--container--3y_fA, [data-purpose='video-player']") || document.body;
    captionObserver.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Vòng lặp định kỳ dự phòng (hỗ trợ chuyển bài SPA và đảm bảo CC được bật)
  setInterval(() => {
    // 1. Kiểm tra chuyển bài
    if (window.location.href !== lastProcessedUrl) {
      lastProcessedUrl = window.location.href;
      currentCueText = "";
      subBox.classList.add("hidden");
      setTimeout(autoEnableCaptions, 1200);
      setTimeout(setupCaptionObserver, 1500);
    }

    // 2. Dự phòng kiểm tra phụ đề
    observeCaptions();
  }, 250);

  // Khởi động
  setTimeout(autoEnableCaptions, 2000);
  setTimeout(setupCaptionObserver, 2500);

})();
