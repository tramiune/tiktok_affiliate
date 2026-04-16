import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { Store } from '../services/store.js';
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
            <button class="btn btn-primary" id="btn-gen-scenes"><i class="fa-solid fa-wand-magic-sparkles"></i> Sinh cảnh quay API</button>
            <button class="btn btn-secondary" id="btn-gen-manual"><i class="fa-regular fa-comment-dots"></i> Dùng ChatGPT</button>
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
    
    <div class="grid-2 mb-6">
        <div class="card bg-secondary-light">
            <div class="card-header"><h3><i class="fa-solid fa-align-left text-primary"></i> Tóm tắt Nội dung</h3></div>
            <div class="card-body">
                <p id="vid-summary" class="text-sm"></p>
            </div>
        </div>

        <div id="retention-card" class="card border-warning hidden">
            <div class="card-header"><h3><i class="fa-solid fa-bolt text-warning"></i> Nút thắt & Bản quyền</h3></div>
            <div class="card-body">
                <p class="text-sm mb-2"><strong>Cliffhanger (Tập này):</strong> <span id="vid-cliffhanger" class="text-secondary font-medium"></span></p>
                <p class="text-sm mb-2"><strong>Loại nhạc gợi ý:</strong> <span id="vid-music" class="badge badge-gray"></span></p>
                <hr class="my-2">
                <p class="text-xs text-gray"><i class="fa-solid fa-shield-halved"></i> <strong>Lời khuyên bản quyền:</strong> <span id="vid-copyright">Đang tải...</span></p>
                <p class="text-xs text-blue-600 mt-1"><i class="fa-solid fa-clapperboard"></i> <strong>Mẹo dựng phim:</strong> <span id="vid-editor-tip">Đang tải...</span></p>
            </div>
        </div>
    </div>

    <!-- Batch Prompt Coordination Center -->
    <div id="batch-center" class="card mb-6 bg-gray-50 border-primary hidden">
        <div class="card-header">
            <h3><i class="fa-solid fa-layer-group text-primary"></i> Trung tâm Điều phối Prompt (VEO 3 Ultra)</h3>
            <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" id="btn-copy-all"><i class="fa-solid fa-copy"></i> Sao chép tất cả</button>
                <button class="btn btn-secondary btn-sm" id="btn-export-txt"><i class="fa-solid fa-file-export"></i> Xuất kịch bản (.txt)</button>
            </div>
        </div>
        <div class="card-body">
            <p class="text-xs text-gray mb-3 italic"><i class="fa-solid fa-info-circle"></i> Sử dụng công cụ này để quản lý việc dán câu lệnh vào Veo 3 Ultra thủ công nhưng nhanh chóng.</p>
            <div id="checklist-container" class="grid-1 gap-2">
                <!-- Checklist items appear here -->
            </div>
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
        // Router already showed the load view
        
        currentChannel = await DBDocs.getChannel(currentChannelId);
        const strategy = await DBDocs.getStrategy(currentChannelId);
        if(!strategy) throw new Error("Chưa có chiến lược cho kênh này");
        
        currentVideo = strategy.videos.find(v => v.id == currentVideoId);
        
        // Fallback for old data missing ID or navigation error
        if(!currentVideo) {
            // Try matching by order (episode number)
            currentVideo = strategy.videos.find(v => v.order == currentVideoId);
            
            // If still not found and currentVideoId is a number, try by index
            if(!currentVideo && !isNaN(currentVideoId)) {
                const idx = parseInt(currentVideoId);
                if(strategy.videos[idx]) {
                    currentVideo = strategy.videos[idx];
                }
            }
        }

        if(!currentVideo) throw new Error("Không tìm thấy thông tin video này");
        
        const rawScenes = await DBDocs.getVideoScenes(currentChannelId, currentVideoId) || [];
        scenes = Array.isArray(rawScenes) ? { scenes: rawScenes } : rawScenes;
        
        // Router handles template injection
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
    document.getElementById('vid-cta').textContent = currentVideo.cta || 'Chưa có CTA';
    document.getElementById('vid-summary').textContent = currentVideo.summary;

    const retentionCard = document.getElementById('retention-card');
    if(currentVideo.cliffhanger) {
        retentionCard.classList.remove('hidden');
        document.getElementById('vid-cliffhanger').textContent = currentVideo.cliffhanger;
        document.getElementById('vid-music').textContent = currentVideo.music_vibe || 'Nhạc thương mại TikTok';
    }

    // Advice from Scene Generation (stored in scenes collection)
    if(scenes && scenes.copyright_advice) {
        document.getElementById('vid-copyright').textContent = scenes.copyright_advice;
        document.getElementById('vid-editor-tip').textContent = scenes.direction_for_editor;
    } else {
        document.getElementById('vid-copyright').textContent = "Bấm 'Sinh cảnh quay' để AI gợi ý.";
        document.getElementById('vid-editor-tip').textContent = "Bấm 'Sinh cảnh quay' để AI gợi ý.";
    }
}

function renderScenes() {
    const container = document.getElementById('scenes-container');
    const empty = document.getElementById('scenes-empty');
    const batchCenter = document.getElementById('batch-center');
    const checklistContainer = document.getElementById('checklist-container');
    
    const sceneList = Array.isArray(scenes) ? scenes : (scenes.scenes || []);

    if(sceneList.length === 0) {
        container.innerHTML = '';
        if(empty) empty.classList.remove('hidden');
        if(batchCenter) batchCenter.classList.add('hidden');
        return;
    }
    
    if(empty) empty.classList.add('hidden');
    if(batchCenter) batchCenter.classList.remove('hidden');

    // Render Checklist in Batch Center
    if(checklistContainer) {
        checklistContainer.innerHTML = sceneList.map((s, idx) => `
            <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-100 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                    <input type="checkbox" class="scene-check" data-idx="${idx}" ${s.isGenerated ? 'checked' : ''}>
                    <span class="text-sm font-medium ${s.isGenerated ? 'text-gray line-through' : ''}">Cảnh ${s.scene_number || (idx+1)}: ${s.action.substring(0, 50)}...</span>
                </div>
                <button class="btn btn-secondary btn-sm quick-copy" data-idx="${idx}">
                    <i class="fa-solid fa-copy"></i> Copy Prompt
                </button>
            </div>
        `).join('');
    }
    
    // Render Main Storyboard
    container.innerHTML = sceneList.map((s, idx) => `
        <div class="card scene-card ${s.isGenerated ? 'opacity-75 bg-gray-50' : ''}">
            <div class="card-body">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-3">
                        <span class="badge ${s.isGenerated ? 'badge-gray' : 'badge-primary'}">Cảnh ${s.scene_number || (idx+1)}</span>
                        ${s.isGenerated ? '<span class="text-xs text-success"><i class="fa-solid fa-check-circle"></i> Đã tạo video</span>' : ''}
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm quick-copy" data-idx="${idx}" title="Copy Prompt nhanh">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                        <a href="#/scene-detail/${currentChannelId}/${currentVideoId}/${idx}" class="btn btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> Xem Chi tiết</a>
                    </div>
                </div>
                <div class="grid-2">
                    <div>
                        <p class="text-xs text-gray uppercase mb-1">Hành động / Bối cảnh:</p>
                        <p class="text-sm mb-3"><strong>${String(s.characters || '').replace(/undefined/g, '')}</strong>: ${s.action}</p>
                        <p class="text-xs text-gray italic"><i class="fa-solid fa-location-dot"></i> ${s.setting}</p>
                        ${!s.veo3_prompt ? '<p class="text-xs text-danger"><i class="fa-solid fa-circle-exclamation"></i> Thiếu Video Prompt. Vui lòng sinh lại.</p>' : ''}
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

    // --- Batch Actions ---
    const btnCopyAll = document.getElementById('btn-copy-all');
    if(btnCopyAll) {
        btnCopyAll.onclick = () => {
            if(!scenes || scenes.length === 0) return;
            const text = scenes.map((s, idx) => `SCENE ${s.scene_number || (idx+1)} PROMPT:\n${s.veo3_prompt}`).join('\n\n---\n\n');
            UI.copyToClipboard(text, "Đã sao chép tất cả kịch bản!");
        };
    }

    const btnExportTxt = document.getElementById('btn-export-txt');
    if(btnExportTxt) {
        btnExportTxt.onclick = () => {
            if(!scenes || scenes.length === 0) return;
            const text = scenes.map((s, idx) => `SCENE ${s.scene_number || (idx+1)}:\nAction: ${s.action}\nVoice: ${s.voice_over}\nPrompt: ${s.veo3_prompt}`).join('\n\n====================\n\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `script_${currentVideo.title.replace(/\s+/g, '_')}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showSuccess("Đã tải file kịch bản!");
        };
    }

    // --- Quick Copy & Checklist ---
    const viewContainer = document.getElementById('view-container');
    
    // Sử dụng event delegation
    viewContainer.onclick = async (e) => {
        const copyBtn = e.target.closest('.quick-copy');
        if(copyBtn) {
            const idx = copyBtn.getAttribute('data-idx');
            const scene = scenes[idx];
            if(scene && scene.veo3_prompt) {
                // 1. Copy to clipboard
                await UI.copyToClipboard(scene.veo3_prompt, `Đã copy Prompt cảnh ${parseInt(idx)+1}`);
                
                // 2. Open tool URL
                const toolUrl = Store.getGeneratorUrl();
                window.open(toolUrl, '_blank');
            }
            return;
        }

        const checkInput = e.target.closest('.scene-check');
        if(checkInput) {
            const idx = checkInput.getAttribute('data-idx');
            if(scenes && scenes.scenes) {
                scenes.scenes[idx].isGenerated = checkInput.checked;
                try {
                    await DBDocs.saveVideoScenes(currentChannelId, currentVideoId, scenes);
                    renderScenes(); // Re-render to update UI (line-through, etc.)
                } catch (err) {
                    UI.showError("Lỗi lưu trạng thái: " + err.message);
                }
            }
            return;
        }
    };

    document.getElementById('btn-gen-scenes').onclick = async () => {
        try {
            UI.injectLoader('form-card', 'AI đang viết kịch bản chi tiết... Vui lòng chờ 20-40s.');
            const scenesEmpty = document.getElementById('scenes-empty');
            if(scenesEmpty) scenesEmpty.classList.add('hidden');
            
            let characterBible = null;
            if(currentChannel.type === 'series') {
                characterBible = await DBDocs.getCharacterBible(currentChannelId);
            }
            
            const result = await OpenAIService.generateVideoScenes(currentVideo, currentChannel, characterBible);
            if(result && result.scenes) {
                // Save both scenes and metadata (advice)
                const dataToSave = {
                    scenes: result.scenes,
                    copyright_advice: result.copyright_advice || '',
                    direction_for_editor: result.direction_for_editor || ''
                };
                
                await DBDocs.saveVideoScenes(currentChannelId, currentVideoId, dataToSave);
                
                // Re-fetch or local update
                scenes = dataToSave;
                
                renderHeader(); // Refresh advice in header
                renderScenes();
                UI.showToast("Đã sinh kịch bản cảnh quay thành công!");
            } else {
                throw new Error("Dữ liệu trả về từ AI không đúng định dạng.");
            }
        } catch (e) {
            UI.showError("Lỗi AI: " + e.message);
            renderScenes();
        } finally {
            UI.removeLoader('form-card');
        }
    };
    
    const btnGenManual = document.getElementById('btn-gen-manual');
    if(btnGenManual) {
        btnGenManual.onclick = async () => {
            try {
                UI.showFullLoader();
                let characterBible = null;
                if(currentChannel.type === 'series') {
                    characterBible = await DBDocs.getCharacterBible(currentChannelId);
                }
                
                UI.setHTML('view-container', template);
                
                const p = OpenAIService.buildVideoScenesPrompt(currentVideo, currentChannel, characterBible);
                const combined = p.systemPrompt + "\n\n" + p.userMessage;
                
                UI.showManualAIModal({
                    title: "Sinh cảnh quay qua ChatGPT",
                    promptText: combined,
                    onConfirm: async (parsedData, close) => {
                        try {
                            if(parsedData && parsedData.scenes) {
                                // Save both scenes and metadata
                                const dataToSave = {
                                    scenes: parsedData.scenes,
                                    copyright_advice: parsedData.copyright_advice || '',
                                    direction_for_editor: parsedData.direction_for_editor || ''
                                };
                                
                                await DBDocs.saveVideoScenes(currentChannelId, currentVideoId, dataToSave);
                                
                                scenes = dataToSave;
                                renderHeader();
                                renderScenes();
                                UI.showToast("Đã nhập kịch bản (JSON) thành công!");
                                close();
                            } else {
                                throw new Error("Key 'scenes' không tồn tại trong JSON.");
                            }
                        } catch(e) {
                            UI.showError("Lỗi dữ liệu: " + e.message);
                        }
                    }
                });
            } catch(e) {
                UI.showError(e.message);
            }
            renderHeader();
            renderScenes();
            setupEvents();
        };
    }
}
