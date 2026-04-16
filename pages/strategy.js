import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Chiến Lược Content';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 id="st-channel-name">Tên kênh...</h2>
            <p class="text-sm text-gray" id="st-concept-name">Concept...</p>
        </div>
        <div class="flex gap-2">
            <div id="st-series-actions"></div>
            <a href="#/dashboard" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Về Dashboard</a>
        </div>
    </div>

    <div class="grid-2">
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-book-open text-primary"></i> Định Hướng Chung</h3>
            </div>
            <div class="card-body">
                <p id="st-direction" class="mb-4">Loading...</p>
                
                <h4 class="text-sm text-gray mb-2">Trụ Cột Nội Dung (Content Pillars):</h4>
                <ul id="st-pillars" class="ml-4 mb-4" style="list-style-type: disc; padding-left: 1.5rem;"></ul>
                
                <div class="grid-2">
                    <div>
                        <h4 class="text-sm text-gray mb-1">Giọng Điệu:</h4>
                        <p id="st-tone"></p>
                    </div>
                    <div>
                        <h4 class="text-sm text-gray mb-1">Hình Ảnh/Style:</h4>
                        <p id="st-visual"></p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header flex justify-between items-center">
                <h3><i class="fa-solid fa-list-ol text-primary"></i> Lộ Trình Video</h3>
                <div>
                    <button class="btn btn-secondary btn-sm" id="btn-regen-manual"><i class="fa-regular fa-comment-dots"></i> Dùng ChatGPT</button>
                    <button class="btn btn-primary btn-sm" id="btn-regen"><i class="fa-solid fa-rotate-right"></i> Tạo Lại</button>
                </div>
            </div>
            <div class="card-body" style="max-height: 500px; overflow-y: auto;">
                <div id="st-videos"></div>
            </div>
        </div>
    </div>
</div>
`;

let currentChannel = null;
let currentStrategy = null;

export async function init(params) {
    const id = params.channelId;
    if(!id) {
        window.location.hash = '#/dashboard';
        return;
    }

    try {
        // Router already showed the main loader
        
        // Fetch DB
        currentChannel = await DBDocs.getChannel(id);
        if(!currentChannel) throw new Error("Không tìm thấy kênh");
        
        currentStrategy = await DBDocs.getStrategy(id);
        
        if(!currentStrategy) {
            UI.setHTML('view-container', `
                <div class="empty-state">
                    <i class="fa-solid fa-file-invoice text-gray" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Kênh này chưa có Chiến Lược!</h3>
                    <p class="mb-4 text-sm text-gray">Hãy để AI phân tích và lập kế hoạch đường dài cho kênh của bạn.</p>
                    <div class="flex justify-center gap-2">
                        <button class="btn btn-primary" id="btn-empty-auto"><i class="fa-solid fa-wand-magic-sparkles"></i> Sinh bằng API</button>
                        <button class="btn btn-secondary" id="btn-empty-manual"><i class="fa-regular fa-comment-dots"></i> Dùng ChatGPT (Miễn phí)</button>
                    </div>
                </div>
            `);
            document.getElementById('btn-empty-auto').onclick = () => generateNewStrategy(id, currentChannel);
            document.getElementById('btn-empty-manual').onclick = () => manualGenerateStrategy(id, currentChannel);
            return;
        }

        renderStrategy();

    } catch (e) {
        UI.showError(e.message);
    }
}

async function generateNewStrategy(id, channel) {
    try {
        UI.injectLoader('view-container', 'Đang sinh chiến lược AI... Hãy chờ 10-30s.');
        const st = await OpenAIService.generateStrategy(channel);
        await DBDocs.saveStrategy(id, st);
        currentStrategy = st;
        await init({ channelId: id }); // Re-init current page
    } catch (e) {
        UI.showError("Lỗi AI: " + e.message);
    } finally {
        UI.removeLoader('view-container');
    }
}

function manualGenerateStrategy(id, channel) {
    const p = OpenAIService.buildStrategyPrompt(channel);
    const combined = p.systemPrompt + "\\n\\n" + p.userMessage;
    UI.showManualAIModal({
        title: "Tạo Chiến Lược qua ChatGPT",
        promptText: combined,
        onConfirm: async (parsedData, close) => {
            try {
                UI.injectLoader('view-container', 'Đang lưu dữ liệu...');
                await DBDocs.saveStrategy(id, parsedData);
                close();
                await init({ channelId: id });
            } catch (e) {
                UI.showError(e.message);
            } finally {
                UI.removeLoader('view-container');
            }
        }
    });
}

function renderStrategy() {
    // Note: Template is already injected by Router
    const nameEl = document.getElementById('st-channel-name');
    if(!nameEl) return; // Prevent errors if user navigated away
    
    document.getElementById('st-channel-name').textContent = currentChannel.name;
    
    // Series Action
    if(currentChannel.type === 'series') {
        document.getElementById('st-series-actions').innerHTML = `
            <a href="#/character-bible/${currentChannel.id}" class="btn btn-secondary"><i class="fa-solid fa-users"></i> Hồ sơ nhân vật</a>
        `;
    }

    document.getElementById('st-concept-name').textContent = "Concept: " + (currentStrategy.conceptName || 'Mặc định');
    
    document.getElementById('st-direction').textContent = currentStrategy.contentDirection;
    document.getElementById('st-tone').textContent = currentStrategy.toneOfVoice;
    document.getElementById('st-visual').textContent = currentStrategy.visualStyle;
    
    const pillars = currentStrategy.pillars || [];
    document.getElementById('st-pillars').innerHTML = pillars.map(p => `<li>${p}</li>`).join('');
    
    const videos = currentStrategy.videos || [];
    const vHtml = videos.map(v => `
        <div class="result-block">
            <h4>Tập ${v.order}: ${v.title}</h4>
            <p class="text-sm mb-2"><strong>Mục tiêu:</strong> ${v.goal}</p>
            <p class="text-sm mb-2"><strong>Tóm tắt:</strong> ${v.summary}</p>
            <p class="text-sm text-primary mb-2"><em><i class="fa-solid fa-quote-left"></i> Hook: ${v.hook}</em></p>
            <p class="text-xs text-gray"><i class="fa-solid fa-bullhorn"></i> CTA: ${v.cta}</p>
            <div class="mt-3">
                <a href="#/video-detail/${currentChannel.id}/${v.id}" class="btn btn-secondary btn-sm"><i class="fa-solid fa-wand-magic-sparkles"></i> Xem chi tiết & Viết Cảnh</a>
            </div>
        </div>
    `).join('');
    
    document.getElementById('st-videos').innerHTML = vHtml;
    
    // Setup re-gen button
    document.getElementById('btn-regen').onclick = () => {
        UI.showModal({
            title: "Tạo lại Kế hoạch bằng API",
            bodyHTML: "<p>Hành động này sẽ thay thế lộ trình video hiện tại bằng một lộ trình mới do AI viết. Quá trình này sẽ tốn token từ API Key của bạn. Bạn có chắc chắn không?</p>",
            onConfirm: async (close) => {
                close();
                await generateNewStrategy(currentChannel.id, currentChannel);
            }
        });
    };
    
    document.getElementById('btn-regen-manual').onclick = () => {
        manualGenerateStrategy(currentChannel.id, currentChannel);
    };
}
