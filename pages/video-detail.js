import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Chi tiết Video';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 id="vid-title">Tiêu đề Video...</h2>
            <p class="text-sm text-gray" id="vid-meta">Kênh: ...</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-primary" id="btn-gen-scenes"><i class="fa-solid fa-wand-magic-sparkles"></i> Sinh cảnh quay AI</button>
            <button class="btn btn-secondary" id="btn-back-st"><i class="fa-solid fa-arrow-left"></i> Về Chiến lược</button>
        </div>
    </div>

    <div class="grid-3 mb-6">
        <div class="card bg-primary-light">
            <div class="card-body">
                <h4 class="text-xs text-primary uppercase mb-1">Mục tiêu</h4>
                <p id="vid-goal" class="text-sm"></p>
            </div>
        </div>
        <div class="card bg-secondary-light">
            <div class="card-body">
                <h4 class="text-xs text-secondary uppercase mb-1">Hook mở đầu</h4>
                <p id="vid-hook" class="text-sm italic"></p>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h4 class="text-xs text-gray uppercase mb-1">CTA gợi ý</h4>
                <p id="vid-cta" class="text-sm"></p>
            </div>
        </div>
    </div>
    
    <div class="card mb-6">
        <div class="card-header"><h3><i class="fa-solid fa-align-left text-primary"></i> Tóm tắt Nội dung</h3></div>
        <div class="card-body">
            <p id="vid-summary"></p>
        </div>
    </div>

    <div class="section-title mb-4">
        <h3><i class="fa-solid fa-film text-primary"></i> Kịch bản Cảnh quay (Storyboard)</h3>
    </div>
    
    <div id="scenes-container" class="grid-1 gap-4">
        <!-- Scenes render here -->
    </div>

    <div id="scenes-empty" class="empty-state">
        <i class="fa-solid fa-clapperboard"></i>
        <p>Chưa có kịch bản cảnh quay. Hãy bấm nút <strong>"Sinh cảnh quay AI"</strong> bên trên để bắt đầu.</p>
    </div>
</div>
`;

let currentChannelId = null;
let currentVideoId = null;
let currentChannel = null;
let currentVideo = null;
let scenes = [];

export async function init(params) {
    currentChannelId = params.channelId;
    currentVideoId = params.videoId;
    
    if(!currentChannelId || !currentVideoId) {
        window.location.hash = '#/dashboard';
        return;
    }

    try {
        UI.showFullLoader();
        
        currentChannel = await DBDocs.getChannel(currentChannelId);
        const strategy = await DBDocs.getStrategy(currentChannelId);
        if(!strategy) throw new Error("Chưa có chiến lược cho kênh này");
        
        currentVideo = strategy.videos.find(v => v.id == currentVideoId);
        if(!currentVideo) throw new Error("Không tìm thấy video này");
        
        scenes = await DBDocs.getVideoScenes(currentChannelId, currentVideoId) || [];
        
        // Render template back after loader
        document.getElementById('view-container').innerHTML = template;
        
        renderHeader();
        renderScenes();
        setupEvents();
    } catch (e) {
        UI.showError(e.message);
    }
}

function renderHeader() {
    document.getElementById('vid-title').textContent = currentVideo.title;
    document.getElementById('vid-meta').textContent = `Kênh: ${currentChannel.name} | Tập: ${currentVideo.order || 'Chưa rõ'}`;
    document.getElementById('vid-goal').textContent = currentVideo.goal;
    document.getElementById('vid-hook').textContent = currentVideo.hook;
    document.getElementById('vid-cta').textContent = currentVideo.cta;
    document.getElementById('vid-summary').textContent = currentVideo.summary;
}

function renderScenes() {
    const container = document.getElementById('scenes-container');
    const empty = document.getElementById('scenes-empty');
    
    if(!scenes || scenes.length === 0) {
        container.innerHTML = '';
        if(empty) empty.classList.remove('hidden');
        return;
    }
    
    if(empty) empty.classList.add('hidden');
    container.innerHTML = scenes.map((s, idx) => `
        <div class="card scene-card">
            <div class="card-body">
                <div class="flex justify-between items-center mb-3">
                    <span class="badge badge-primary">Cảnh ${s.scene_number || (idx+1)}</span>
                    <a href="#/scene-detail/${currentChannelId}/${currentVideoId}/${idx}" class="btn btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> Xem & Lấy câu lệnh VEO 3</a>
                </div>
                <div class="grid-2">
                    <div>
                        <p class="text-xs text-gray uppercase mb-1">Hành động / Bối cảnh:</p>
                        <p class="text-sm mb-3"><strong>${s.characters || ''}</strong>: ${s.action}</p>
                        <p class="text-xs text-gray italic"><i class="fa-solid fa-location-dot"></i> ${s.setting}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray uppercase mb-1">Voice Over / Lời thoại:</p>
                        <p class="text-sm border-l-4 border-primary pl-2 bg-gray-light py-1">${s.voice_over || '(Không có lời thoại)'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEvents() {
    document.getElementById('btn-back-st').onclick = () => {
        window.location.hash = `#/channel/${currentChannelId}`;
    };

    document.getElementById('btn-gen-scenes').onclick = async () => {
        try {
            UI.setHTML('scenes-container', '<div class="loading-full"><i class="fa-solid fa-wand-magic-sparkles fa-spin text-primary"></i> AI đang viết kịch bản chi tiết từng cảnh... Vui lòng chờ 20-40s.</div>');
            const scenesEmpty = document.getElementById('scenes-empty');
            if(scenesEmpty) scenesEmpty.classList.add('hidden');
            
            let characterBible = null;
            if(currentChannel.type === 'series') {
                characterBible = await DBDocs.getCharacterBible(currentChannelId);
            }
            
            const result = await OpenAIService.generateVideoScenes(currentVideo, currentChannel, characterBible);
            if(result && result.scenes) {
                scenes = result.scenes;
                await DBDocs.saveVideoScenes(currentChannelId, currentVideoId, scenes);
                renderScenes();
                UI.showToast("Đã sinh kịch bản cảnh quay thành công!");
            } else {
                throw new Error("Dữ liệu trả về từ AI không đúng định dạng.");
            }
        } catch (e) {
            UI.showError("Lỗi AI: " + e.message);
            renderScenes();
        }
    };
}
