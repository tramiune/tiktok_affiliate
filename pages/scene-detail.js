import { DBDocs } from '../services/firestore.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Chi tiết Cảnh quay';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 id="sc-title">Cảnh ...</h2>
            <p class="text-sm text-gray" id="sc-meta">Video: ...</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-primary" id="btn-copy-prompt"><i class="fa-solid fa-copy"></i> Sao chép câu lệnh VEO 3</button>
            <button class="btn btn-secondary" id="btn-back-vid"><i class="fa-solid fa-arrow-left"></i> Về Video</button>
        </div>
    </div>

    <div class="grid-2 mb-6">
        <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-info-circle text-primary"></i> Thông tin Cảnh</h3></div>
            <div class="card-body">
                <div class="form-group">
                    <label>Hành động & Nhân vật</label>
                    <textarea id="sc-action" class="form-control" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label>Lời thoại / Voice Over</label>
                    <textarea id="sc-voice" class="form-control" rows="2"></textarea>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Bối cảnh</label>
                        <input type="text" id="sc-setting" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Góc quay / Camera</label>
                        <input type="text" id="sc-camera" class="form-control">
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-save-scene">Lưu thay đổi</button>
            </div>
        </div>

        <div class="card bg-dark text-white">
            <div class="card-header border-gray-700">
                <h3 class="text-white"><i class="fa-solid fa-code text-primary"></i> Câu lệnh tạo Video AI (Prompt VEO 3)</h3>
            </div>
            <div class="card-body">
                <p class="text-xs text-gray-400 mb-2">Dùng câu lệnh này để dán vào các công cụ tạo Video AI như VEO 3, Kling, Luma...</p>
                <div class="form-group mb-4">
                    <textarea id="sc-veo-prompt" class="form-control bg-dark text-blue-400 border-gray-700 font-mono" rows="8" placeholder="Hệ thống chưa tạo prompt cho cảnh này..."></textarea>
                </div>
                <div>
                    <p class="text-xs text-gray-400 mb-1">Cảm xúc / Mood:</p>
                    <input type="text" id="sc-emotion" class="form-control bg-dark text-white border-gray-700" placeholder="Ví dụ: Cinematic, Sad, High Energy...">
                </div>
            </div>
        </div>
    </div>
</div>
`;

let currentChannelId = null;
let currentVideoId = null;
let currentSceneId = null;
let scenes = [];
let scene = null;

export async function init(params) {
    currentChannelId = params.channelId;
    currentVideoId = params.videoId;
    currentSceneId = parseInt(params.sceneId);

    if(!currentChannelId || !currentVideoId || isNaN(currentSceneId)) {
        window.location.hash = '#/dashboard';
        return;
    }

    try {
        // Router already showed the load view
        
        const strategy = await DBDocs.getStrategy(currentChannelId);
        const video = strategy.videos.find(v => v.id == currentVideoId);
        
        const rawScenes = await DBDocs.getVideoScenes(currentChannelId, currentVideoId);
        scenes = Array.isArray(rawScenes) ? { scenes: rawScenes } : (rawScenes || { scenes: [] });
        
        scene = scenes.scenes[currentSceneId];
        
        if(!scene) throw new Error("Không tìm thấy cảnh quay này");
        
        renderScene(video);
        setupEvents();
    } catch (e) {
        UI.showError(e.message);
    }
}

function renderScene(video) {
    document.getElementById('sc-title').textContent = `Cảnh ${scene.scene_number || (currentSceneId + 1)}`;
    document.getElementById('sc-meta').textContent = `Video: ${video.title}`;
    
    document.getElementById('sc-action').value = scene.action;
    document.getElementById('sc-voice').value = scene.voice_over || "";
    document.getElementById('sc-setting').value = scene.setting;
    document.getElementById('sc-camera').value = scene.camera_angle || "";
    
    document.getElementById('sc-veo-prompt').value = scene.veo3_prompt || "";
    document.getElementById('sc-emotion').value = scene.emotion || "";
}

function setupEvents() {
    document.getElementById('btn-back-vid').onclick = () => {
        window.location.hash = `#/video-detail/${currentChannelId}/${currentVideoId}`;
    };

    document.getElementById('btn-copy-prompt').onclick = () => {
        const prompt = document.getElementById('sc-veo-prompt').value;
        navigator.clipboard.writeText(prompt).then(() => {
            UI.showToast("Đã sao chép câu lệnh!");
        });
    };

    document.getElementById('btn-save-scene').onclick = async () => {
        scene.action = document.getElementById('sc-action').value;
        scene.voice_over = document.getElementById('sc-voice').value;
        scene.setting = document.getElementById('sc-setting').value;
        scene.camera_angle = document.getElementById('sc-camera').value;
        scene.veo3_prompt = document.getElementById('sc-veo-prompt').value;
        scene.emotion = document.getElementById('sc-emotion').value;
        
        scenes.scenes[currentSceneId] = scene;
        
        try {
            await DBDocs.saveVideoScenes(currentChannelId, currentVideoId, scenes);
            UI.showToast("Đã lưu thay đổi cảnh quay");
        } catch (e) {
            UI.showError(e.message);
        }
    };
}
