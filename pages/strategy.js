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
        <div>
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
                <button class="btn btn-primary btn-sm" id="btn-regen"><i class="fa-solid fa-rotate-right"></i> Tạo Lại</button>
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
    const id = params.id;
    if(!id) {
        window.location.hash = '#/dashboard';
        return;
    }

    try {
        UI.showFullLoader();
        
        // Fetch DB
        currentChannel = await DBDocs.getChannel(id);
        if(!currentChannel) throw new Error("Không tìm thấy kênh");
        
        currentStrategy = await DBDocs.getStrategy(id);
        
        if(!currentStrategy) {
            UI.showModal({
                title: "Kênh chưa có chiến lược", 
                bodyHTML: "<p>Kênh này đang ở trạng thái Nháp. Bạn có muốn AI tạo chiến lược bây giờ không?</p>",
                onConfirm: async (close) => {
                    close();
                    await generateNewStrategy(id, currentChannel);
                }
            });
            UI.setHTML('view-container', '<div class="empty-state">Kênh trống. Đang chờ xác nhận...</div>');
            return;
        }

        renderStrategy();

    } catch (e) {
        UI.showError(e.message);
    }
}

async function generateNewStrategy(id, channel) {
    try {
        UI.setHTML('view-container', '<div class="loading-full"><i class="fa-solid fa-wand-magic-sparkles fa-spin text-primary"></i> Đang sinh chiến lược AI... Hãy chờ khoảng 10-30 giây.</div>');
        const st = await OpenAIService.generateStrategy(channel);
        await DBDocs.saveStrategy(id, st);
        currentStrategy = st;
        window.location.reload(); // Reload to render
    } catch (e) {
        UI.showError("Lỗi AI: " + e.message);
        window.location.hash = '#/dashboard';
    }
}

function renderStrategy() {
    // Inject original template since UI.showFullLoader removed it
    document.getElementById('view-container').innerHTML = template;
    
    document.getElementById('st-channel-name').textContent = currentChannel.name;
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
                <button class="btn btn-secondary btn-sm" onclick="alert('Tính năng generate kịch bản chi tiết & Cảnh quay sẽ nằm ở trang sau.')"><i class="fa-solid fa-wand-magic-sparkles"></i> Xem chi tiết & Viết Cảnh</button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('st-videos').innerHTML = vHtml;
    
    // Setup re-gen button
    document.getElementById('btn-regen').onclick = () => {
        UI.showModal({
            title: "Tạo lại Kế hoạch",
            bodyHTML: "<p>Hành động này sẽ thay thế lộ trình video hiện tại bằng một lộ trình mới do AI viết. Bạn có chắc chắn không?</p>",
            onConfirm: async (close) => {
                close();
                await generateNewStrategy(currentChannel.id, currentChannel);
            }
        })
    };
}
