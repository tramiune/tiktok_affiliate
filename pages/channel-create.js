import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { UI } from '../assets/js/ui.js';

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
                    <input type="number" id="f-count" class="form-control" value="5" min="1" max="50">
                </div>
            </div>
            
            <div class="mt-6 flex justify-between gap-2 overflow-x-auto">
                <button id="btn-save-draft" class="btn btn-secondary"><i class="fa-solid fa-floppy-disk"></i> Lưu Nháp</button>
                <div class="flex gap-2">
                    <button id="btn-gen-manual" class="btn btn-secondary"><i class="fa-regular fa-comment-dots"></i> Dùng ChatGPT thủ công</button>
                    <button id="btn-gen-ai" class="btn btn-primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Tạo Chiến Lược AI</button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

export function init() {
    const btnDraft = document.getElementById('btn-save-draft');
    const btnGen = document.getElementById('btn-gen-ai');
    const btnGenManual = document.getElementById('btn-gen-manual');

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

    const ensureIds = (list, prefix) => {
        return list.map((item, idx) => ({
            ...item,
            id: item.id || `${prefix}_${idx + 1}_${Date.now().toString(36)}`
        }));
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
            UI.injectLoader('form-card', 'Bước 1: Đang thiết lập Chiến lược & Dàn nhân vật...');
            
            // 1. Tạo Foundation (Strategy + Chars)
            const foundation = await OpenAIService.generateStrategy(data);
            const strategy = { ...foundation };
            delete strategy.characters;
            let characters = foundation.characters || [];
            characters = ensureIds(characters, 'char');

            // 2. Loop sinh video theo đợt
            let allVideos = [];
            const targetCount = parseInt(data.videoCount) || 5;
            const batchSize = 10;
            
            for(let start = 1; start <= targetCount; start += batchSize) {
                const count = Math.min(batchSize, targetCount - start + 1);
                UI.setHTML(`loader-form-card`, `<i class="fa-solid fa-wand-magic-sparkles fa-spin fa-2x text-primary"></i><span>Bước 2: Đang viết tập ${start} - ${start + count - 1}...</span>`);
                
                const batchResult = await OpenAIService.generateVideosBatch(data, strategy, characters, allVideos, start, count);
                if(batchResult && batchResult.videos) {
                    const sanitizedBatch = ensureIds(batchResult.videos, 'vid');
                    allVideos = allVideos.concat(sanitizedBatch);
                }
            }

            strategy.videos = allVideos;
            
            // 3. Lưu dữ liệu
            UI.setHTML(`loader-form-card`, `<i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><span>Đang hoàn tất lưu trữ...</span>`);
            const id = await DBDocs.createChannel(data);
            await DBDocs.saveStrategy(id, strategy);
            if(characters.length > 0) {
                await DBDocs.saveCharacterBible(id, characters);
            }
            
            UI.showSuccess("Tuyệt vời! Chiến lược và dàn nhân vật đã sẵn sàng.");
            window.location.hash = '#/channel/' + id;
            
        } catch(e) {
            UI.showError("Lỗi AI: " + e.message);
        } finally {
            UI.removeLoader('form-card');
        }
    });

    btnGenManual.addEventListener('click', () => {
        const data = getFormData();
        if(!validate(data)) return;

        const p = OpenAIService.buildStrategyPrompt(data);
        const combined = p.systemPrompt + "\n\n" + p.userMessage;

        // Trình hướng dẫn từng bước
        const startManualWizard = () => {
             UI.showManualAIModal({
                title: "Bước 1: Lấy Chiến lược & Dàn nhân vật",
                promptText: combined,
                onConfirm: async (parsedFoundation, closeFirst) => {
                    if(!parsedFoundation.conceptName || !parsedFoundation.characters) {
                        UI.showError("JSON thiếu 'conceptName' hoặc 'characters'. Vui lòng kiểm tra lại kết quả từ ChatGPT.");
                        return;
                    }
                    
                    const strategy = { ...parsedFoundation };
                    delete strategy.characters;
                    const characters = ensureIds(parsedFoundation.characters || [], 'char');
                    const targetCount = parseInt(data.videoCount) || 5;
                    
                    closeFirst();
                    // Delay để tránh xung đột modal layer
                    setTimeout(() => {
                        continueManualVideos(strategy, characters, [], 1, targetCount);
                    }, 400);
                }
            });
        };

        const continueManualVideos = (strategy, characters, allVideos, start, total) => {
            const count = Math.min(10, total - start + 1);
            const p = OpenAIService.buildVideosBatchPrompt(data, strategy, characters, allVideos, start, count);
            const combined = p.systemPrompt + "\n\n" + p.userMessage;

            const currentStep = Math.ceil(start / 10);
            const totalSteps = Math.ceil(total / 10);

            UI.showManualAIModal({
                title: `Bước 2.${currentStep}: Lấy nội dung tập ${start} - ${start + count - 1} (Tổng: ${total})`,
                promptText: combined,
                onConfirm: async (batchResult, close) => {
                    if(!batchResult || !batchResult.videos || !Array.isArray(batchResult.videos)) {
                        UI.showError("JSON thiếu danh sách 'videos' hoặc sai định dạng. Hãy kiểm tra lại.");
                        return;
                    }

                    const sanitizedBatch = ensureIds(batchResult.videos, 'vid');
                    allVideos = allVideos.concat(sanitizedBatch);
                    close();
                    
                    if(allVideos.length < total) {
                        setTimeout(() => {
                            continueManualVideos(strategy, characters, allVideos, allVideos.length + 1, total);
                        }, 400);
                    } else {
                        // Hoàn tất
                        try {
                            UI.injectLoader('form-card', 'Đang thiết lập kênh và lưu tập phim...');
                            strategy.videos = allVideos;
                            const id = await DBDocs.createChannel(data);
                            await DBDocs.saveStrategy(id, strategy);
                            if(characters.length > 0) {
                                await DBDocs.saveCharacterBible(id, characters);
                            }
                            UI.showSuccess(`Đã nhập thành công ${allVideos.length} tập phim!`);
                            window.location.hash = '#/channel/' + id;
                        } catch (e) {
                            UI.showError("Lỗi lưu trữ: " + e.message);
                            UI.removeLoader('form-card');
                        }
                    }
                }
            });
        };

        startManualWizard();
    });
}
