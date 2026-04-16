import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { UI } from '../js/ui.js';

export const title = 'Tạo Kênh Mới';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2>Tạo kênh TikTok mới</h2>
            <p class="text-sm text-gray">Nhập thông tin chi tiết để AI có thể phân tích và lên chiến lược tốt nhất.</p>
        </div>
        <a href="#/dashboard" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Quay lại</a>
    </div>

    <div class="card" id="form-card">
        <div class="card-body">
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Tên kênh</label>
                    <input type="text" id="f-name" class="form-control" placeholder="Ví dụ: Review Cực Chất">
                </div>
                <div class="form-group">
                    <label class="form-label">Chủ đề chính</label>
                    <input type="text" id="f-topic" class="form-control" placeholder="Ví dụ: Review đồ công nghệ, gia dụng">
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Mô tả tổng quản</label>
                    <textarea id="f-desc" class="form-control" placeholder="Kênh tập trung review các sản phẩm tiện ích giá rẻ, giúp sinh viên tiết kiệm..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Mục tiêu kênh</label>
                    <input type="text" id="f-goal" class="form-control" placeholder="Câu view, điều hướng link bio, hay làm thương hiệu?">
                </div>
                <div class="form-group">
                    <label class="form-label">Đối tượng mục tiêu</label>
                    <input type="text" id="f-audience" class="form-control" placeholder="Ví dụ: Gen Z, dân văn phòng, mẹ bỉm sữa...">
                </div>
                <div class="form-group">
                    <label class="form-label">Loại nội dung</label>
                    <select id="f-type" class="form-control">
                        <option value="standalone">Các video độc lập cùng chủ đề (Khuyên dùng)</option>
                        <option value="series">Series có cốt truyện trải dài nhiều tập</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Số lượng video cần AI gợi ý đợt này</label>
                    <input type="number" id="f-count" class="form-control" value="5" min="1" max="20">
                </div>
            </div>
            
            <div class="mt-6 flex justify-between">
                <button id="btn-save-draft" class="btn btn-secondary"><i class="fa-solid fa-floppy-disk"></i> Lưu Nháp</button>
                <button id="btn-gen-ai" class="btn btn-primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Tạo Chiến Lược bằng AI</button>
            </div>
        </div>
    </div>
</div>
`;

export function init() {
    const btnDraft = document.getElementById('btn-save-draft');
    const btnGen = document.getElementById('btn-gen-ai');

    const getFormData = () => ({
        name: UI.getValue('f-name'),
        topic: UI.getValue('f-topic'),
        desc: UI.getValue('f-desc'),
        goal: UI.getValue('f-goal'),
        audience: UI.getValue('f-audience'),
        type: UI.getValue('f-type'),
        videoCount: UI.getValue('f-count')
    });

    const validate = (data) => {
        if(!data.name || !data.topic || !data.desc) {
            UI.showError("Vui lòng điền đủ Tên kênh, Chủ đề và Mô tả.");
            return false;
        }
        return true;
    };

    btnDraft.addEventListener('click', async () => {
        const data = getFormData();
        if(!validate(data)) return;
        
        try {
            UI.injectLoader('form-card', 'Đang lưu nội dung...');
            const id = await DBDocs.createChannel(data);
            UI.showSuccess("Đã lưu nháp kênh!");
            window.location.hash = '#/dashboard';
        } catch(e) {
            UI.showError(e.message);
        } finally {
            UI.removeLoader('form-card');
        }
    });

    btnGen.addEventListener('click', async () => {
        const data = getFormData();
        if(!validate(data)) return;

        try {
            UI.injectLoader('form-card', 'AI đang tổng hợp và viết định hướng...');
            
            // 1. Tạo AI Strategy
            const aiStrategy = await OpenAIService.generateStrategy(data);
            
            // 2. Lưu Channel trước
            const id = await DBDocs.createChannel(data);
            
            // 3. Lưu Strategy
            await DBDocs.saveStrategy(id, aiStrategy);
            
            UI.showSuccess("Tuyệt vời! AI đã lập xong chiến lược.");
            window.location.hash = '#/channel/' + id; // Switch to strategy/detail view
            
        } catch(e) {
            UI.showError("Lỗi AI: " + e.message);
        } finally {
            UI.removeLoader('form-card');
        }
    });
}
