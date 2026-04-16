/**
 * UI Helpers and Components
 */

export const UI = {
  // Toasts
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);

    // Auto remove after 3s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showError(message) {
    this.showToast(message, 'error');
  },

  showSuccess(message) {
    this.showToast(message, 'success');
  },

  // Modals
  showModal({ title, bodyHTML, onConfirm, showCancel = true, confirmText = 'Xác nhận' }) {
    const overlay = document.getElementById('modal-container');
    const modal = overlay?.querySelector('.modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');
    const btnClose = document.getElementById('modal-close');

    if (!overlay || !modal) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    btnConfirm.textContent = confirmText;
    
    btnCancel.style.display = showCancel ? 'inline-flex' : 'none';

    // Xóa event listeners cũ bằng cách clone node
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 200);
    };

    newBtnConfirm.addEventListener('click', () => {
      if (onConfirm) onConfirm(closeModal);
      else closeModal();
    });

    // Wire up close and cancel
    btnCancel.onclick = closeModal;
    if (btnClose) btnClose.onclick = closeModal;

    overlay.classList.remove('hidden');
    // Force a reflow to ensure transition works
    void modal.offsetWidth;
    modal.classList.add('show');
  },

  showManualAIModal({ title, promptText, onConfirm }) {
    const overlay = document.getElementById('modal-container');
    const modal = overlay?.querySelector('.modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');
    const btnClose = document.getElementById('modal-close');

    if (!overlay || !modal) return;

    titleEl.textContent = title;
    
    // Encode HTML để tránh lỗi vỡ giao diện nếu promptText có tag
    const safePromptText = promptText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    bodyEl.innerHTML = `
      <div class="form-group mb-4">
          <label>1. Sao chép toàn bộ Câu lệnh (Prompt) này:</label>
          <textarea id="manual-prompt-text" class="form-control text-xs font-mono bg-gray-50 text-gray-700" rows="6" readonly>${safePromptText}</textarea>
          <button class="btn btn-secondary btn-sm mt-2" id="btn-copy-manual-prompt"><i class="fa-solid fa-copy"></i> Sao chép nhanh</button>
      </div>
      <div class="form-group">
          <label>2. Dán kết quả (JSON) mà ChatGPT trả về vào đây:</label>
          <textarea id="manual-json-result" class="form-control font-mono" rows="6" placeholder='{"các_trường": "dữ_liệu_của_bạn"}'></textarea>
      </div>
    `;

    setTimeout(() => {
        const btnCopy = document.getElementById('btn-copy-manual-prompt');
        if(btnCopy) {
            btnCopy.onclick = () => {
                 const pt = document.getElementById('manual-prompt-text');
                 pt.select();
                 document.execCommand('copy');
                 this.showToast("Đã copy Prompt! Hãy sang ChatGPT và dán vào.");
            };
        }
    }, 50);

    btnConfirm.textContent = 'Lưu kết quả JSON';
    btnCancel.style.display = 'inline-flex';

    // Xóa event listeners cũ bằng cách clone node
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 200);
    };

    newBtnConfirm.addEventListener('click', () => {
      const jsonStr = document.getElementById('manual-json-result').value;
      if(!jsonStr.trim()) {
          this.showError("Vui lòng dán kết quả JSON từ ChatGPT.");
          return;
      }
      try {
          // Xử lý loại bỏ mã markdown code block nếu có dư do Copy nguyên khung Chat
          let cleanStr = jsonStr.trim();
          if(cleanStr.startsWith('\`\`\`json')) {
              cleanStr = cleanStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
          } else if(cleanStr.startsWith('\`\`\`')) {
              cleanStr = cleanStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
          }
          const parsed = JSON.parse(cleanStr);
          if (onConfirm) onConfirm(parsed, closeModal);
      } catch (e) {
          this.showError("JSON không hợp lệ. Vui lòng copy đúng định dạng chuẩn mà ChatGPT trả về.");
      }
    });

    btnCancel.onclick = closeModal;
    if (btnClose) btnClose.onclick = closeModal;

    overlay.classList.remove('hidden');
    // Force a reflow
    void modal.offsetWidth;
    modal.classList.add('show');
  },

  // Loaders
  showFullLoader(text = 'Đang xử lý...') {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="loading-full"><i class="fa-solid fa-spinner fa-spin"></i> ${text}</div>`;
  },
  
  injectLoader(elementId, text = 'Đang xử lý AI...') {
      const el = document.getElementById(elementId);
      if(!el) return;
      const loader = document.createElement('div');
      loader.className = 'overlay-loader';
      loader.id = `loader-${elementId}`;
      loader.innerHTML = `
        <i class="fa-solid fa-wand-magic-sparkles fa-spin fa-2x text-primary"></i>
        <span>${text}</span>
      `;
      el.style.position = 'relative';
      el.appendChild(loader);
  },
  
  removeLoader(elementId) {
      const loader = document.getElementById(`loader-${elementId}`);
      if(loader) loader.remove();
  },

  // DOM Helpers
  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },

  // Markdown to basic HTML (for line breaks)
  nl2br(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\n/g, '<br>');
  },

  /**
   * Clipboard Helper
   */
  async copyToClipboard(text, successMsg = "Đã sao chép vào bộ nhớ tạm!") {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess(successMsg);
      return true;
    } catch (err) {
      console.error('Lỗi sao chép:', err);
      this.showError("Không thể sao chép tự động. Vui lòng chọn text và copy thủ công.");
      return false;
    }
  }
};
