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
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    btnConfirm.textContent = confirmText;
    
    btnCancel.style.display = showCancel ? 'inline-flex' : 'none';

    // Xóa event listeners cũ bằng cách clone node
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    const closeModal = () => overlay.classList.add('hidden');

    newBtnConfirm.addEventListener('click', () => {
      if (onConfirm) onConfirm(closeModal);
      else closeModal();
    });

    btnCancel.onclick = closeModal;
    document.getElementById('modal-close').onclick = closeModal;

    overlay.classList.remove('hidden');
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
  }
};
