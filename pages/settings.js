import { Store } from '../services/store.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Cài đặt AI & API';

export const template = `
<div class="page-container">
    <div class="card">
        <div class="card-header">
            <h3>Cấu hình OpenAI API Key</h3>
        </div>
        <div class="card-body">
            <div class="form-group">
                <label class="form-label" for="api-key">OpenAI API Key</label>
                <div class="flex gap-2">
                    <input type="password" id="api-key" class="form-control" placeholder="sk-proj-..." autocomplete="off">
                    <button id="btn-toggle-visibility" class="btn btn-secondary">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="form-help">
                    <i class="fa-solid fa-shield-halved text-success"></i> API Key của bạn được lưu an toàn trực tiếp trên trình duyệt này (LocalStorage). Chúng tôi không lưu trữ Key trên Database máy chủ.
                </div>
            </div>
            
            <div class="mt-4">
                <button id="btn-save" class="btn btn-primary"><i class="fa-solid fa-save"></i> Lưu cấu hình</button>
            </div>
        </div>
    </div>
    
    <div class="card">
        <div class="card-header">
            <h3>Về Ứng Dụng</h3>
        </div>
        <div class="card-body text-sm text-gray">
            <p><strong>TikTok AI Content Planner</strong> là công cụ giúp quản lý kịch bản và kế hoạch kênh bằng cách tận dụng trí tuệ nhân tạo.</p>
            <p class="mt-2 text-warning"><i class="fa-solid fa-triangle-exclamation"></i> Lưu ý: Bạn sẽ tự chi trả phí API dựa trên lượng token OpenAI sử dụng trong mỗi lần thiết lập chiến lược hay sinh Prompt.</p>
        </div>
    </div>
</div>
`;

export function init() {
    const inputKey = document.getElementById('api-key');
    const btnToggle = document.getElementById('btn-toggle-visibility');
    const btnSave = document.getElementById('btn-save');

    // Load saved key
    inputKey.value = Store.getOpenAIKey();

    btnToggle.addEventListener('click', () => {
        if (inputKey.type === 'password') {
            inputKey.type = 'text';
            btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
            inputKey.type = 'password';
            btnToggle.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
    });

    btnSave.addEventListener('click', () => {
        const key = inputKey.value.trim();
        if(!key) {
            UI.showError("Vui lòng nhập API Key!");
            return;
        }
        if(!key.startsWith('sk-')) {
            UI.showError("Định dạng API Key không hợp lệ (cần bắt đầu bằng sk-)");
            return;
        }
        
        Store.setOpenAIKey(key);
        UI.showSuccess("Đã lưu API Key thành công!");
    });
}
