import { OpenAIService } from '../services/openai.js';
import { UI } from '../assets/js/ui.js';
import { DBDocs } from '../services/firestore.js';

export const title = 'Mẹ Chồng Nàng Dâu';

export const template = `
<div class="page-container">
    <!-- DETAIL VIEW: Show when a script is selected -->
    <div id="detail-view" class="hidden animate-fade-in">
        <div class="flex justify-between items-center mb-6">
            <button id="btn-back-to-list" class="btn btn-secondary">
                <i class="fa-solid fa-arrow-left"></i> Quay lại Danh sách
            </button>
            <div class="text-right">
                <h2 id="detail-title" class="text-xl font-bold text-primary">Kịch bản Drama</h2>
                <p id="detail-date" class="text-xs text-gray-400"></p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Script & Scenes -->
            <div class="lg:col-span-2 space-y-6">
                <!-- First Image Prompt Card -->
                <div class="card border-primary border-t-4 shadow-md overflow-hidden">
                    <div class="card-header bg-primary-light flex justify-between items-center">
                        <h3 class="text-primary font-bold"><i class="fa-solid fa-image"></i> PROMPT ẢNH ĐẦU TIÊN (CHARACTER DNA)</h3>
                        <button id="btn-copy-dna-detail" class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-copy"></i> Sao chép Prompt Ảnh Đầu
                        </button>
                    </div>
                    <div class="card-body">
                        <p class="text-xs text-gray-600 mb-3 italic">Dán prompt này vào công cụ sinh ảnh để tạo nhân vật đồng nhất cho cả video.</p>
                        <div class="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono whitespace-pre-wrap border border-gray-700" id="detail-dna-text"></div>
                    </div>
                </div>

                <!-- Scenes List -->
                <div id="detail-scenes-container" class="space-y-4">
                    <!-- Scenes will be injected here -->
                </div>
            </div>

            <!-- Right: Full Prompt & Actions -->
            <div class="lg:col-span-1">
                <div class="card sticky top-6 shadow-md border-success border-t-4">
                    <div class="card-header bg-success-light flex justify-between items-center">
                        <h3 class="text-success font-bold"><i class="fa-solid fa-code"></i> FULL PROMPT VEO 3</h3>
                        <button id="btn-copy-full-detail" class="btn btn-success btn-sm">
                            <i class="fa-solid fa-copy"></i> Copy All
                        </button>
                    </div>
                    <div class="card-body">
                        <p class="text-xs text-gray-500 mb-4">Mẹo: Bạn có thể copy toàn bộ tập lệnh này để dán vào VEO 3 Ultra hoặc các công cụ video chuyên dụng.</p>
                        <pre id="detail-full-prompt" class="bg-gray-800 text-gray-300 p-3 rounded text-[10px] leading-relaxed whitespace-pre-wrap border font-mono overflow-y-auto" style="max-height: 500px;"></pre>
                        
                        <div class="mt-6 pt-6 border-t">
                            <button id="btn-delete-detail" class="btn btn-danger btn-block mb-2">
                                <i class="fa-solid fa-trash-can"></i> Xoá kịch bản này
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- LIST VIEW: Show by default or when no scriptId -->
    <div id="list-view" class="animate-fade-in">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: History / Saved Scripts -->
            <div class="lg:col-span-2 order-2 lg:order-1">
                <div class="card shadow-sm">
                    <div class="card-header flex justify-between items-center">
                        <h3><i class="fa-solid fa-box-archive text-primary"></i> Kho Kịch Bản Đã Lưu</h3>
                        <span id="history-count" class="badge badge-secondary">0 tập</span>
                    </div>
                    <div class="card-body">
                        <div id="scripts-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Items will be injected here -->
                        </div>
                        <div id="empty-history" class="text-center py-12 hidden">
                            <div class="text-gray-300 mb-4 text-5xl"><i class="fa-solid fa-ghost"></i></div>
                            <h4 class="text-gray-500">Chưa có kịch bản nào</h4>
                            <p class="text-xs text-gray-400">Hãy nhập tình huống bên phải và nhấn "Sinh kịch bản"!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Generator Controls -->
            <div class="lg:col-span-1 order-1 lg:order-2">
                <div class="card sticky top-6 border-primary border-t-4 shadow-md bg-primary-light/10">
                    <div class="card-header bg-primary-light">
                        <h3><i class="fa-solid fa-magic-wand-sparkles text-primary"></i> Sinh Drama Mới</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group mb-4">
                            <label class="form-label font-bold">Tình huống / Drama (Topic)</label>
                            <textarea id="conflict-topic" class="form-control" placeholder="Ví dụ: Mẹ chồng khó chịu vì con dâu lười làm việc nhà, hoặc để trống để AI tự tạo drama ngẫu nhiên..." rows="4"></textarea>
                            <p class="text-[10px] text-gray-500 mt-2 italic">* AI sẽ tự thiết kế kịch bản kịch tính gồm 5-7 cảnh phim, bao gồm hội thoại và hiệu ứng camera zoom theo chuẩn VEO 3.</p>
                        </div>
                        <button id="btn-generate" class="btn btn-primary btn-lg btn-block shadow-lg">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> SINH KỊCH BẢN & LƯU
                        </button>
                        <button id="btn-clear" class="btn btn-secondary btn-sm btn-block mt-2">
                            <i class="fa-solid fa-eraser"></i> Xoá nội dung
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

const CHARACTER_DNA_TEMPLATE = `Masterpiece, high-end 3D animation style, Disney and Pixar aesthetic, extremely detailed textures, cinematic lighting, 8k resolution.

A tense domestic scene in a modern Vietnamese home.
LEFT: Mother-in-law, 55 years old, strict and traditional, hair in a neat bun, wearing an elegant silk bà ba shirt, sharp eyes, standing with arms crossed, slightly frowning.
RIGHT: Daughter-in-law, 25 years old, beautiful and modern, long silky black hair, wearing a soft pastel dress, holding a smartphone, looking tired but determined.

ENVIRONMENT: Modern Vietnamese living room, warm but high-contrast cinematic lighting.
- Mother-in-law ALWAYS on the LEFT
- Daughter-in-law ALWAYS on the RIGHT
- Disney-style expressive facial features
- No background characters, focus on the two women.`;

const SCENE_RULES = `GLOBAL 3D ANIMATION RULES:
- High-quality 3D renders, Pixar-style expressive faces
- Mother-in-law ALWAYS on LEFT, daughter-in-law ALWAYS on RIGHT
- Characters keep identical appearance, outfit, and height
- Camera is COMPLETELY FIXED (Statice), no pan, no tilt
- Characters do not move position, only subtle facial acting
- Use cinematic depth of field (blurry background)
- No text, no subtitles on screen
- Dramatic and emotional lighting changes per scene mood`;

export async function init(params) {
    const listView = document.getElementById('list-view');
    const detailView = document.getElementById('detail-view');
    const scriptsGrid = document.getElementById('scripts-grid');
    const emptyHistory = document.getElementById('empty-history');
    const historyCount = document.getElementById('history-count');
    const btnGenerate = document.getElementById('btn-generate');
    const topicInput = document.getElementById('conflict-topic');
    const btnBack = document.getElementById('btn-back-to-list');

    // Routing Logic: Show Detail or List
    if (params && params.scriptId) {
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');
        await loadScriptDetail(params.scriptId);
    } else {
        listView.classList.remove('hidden');
        detailView.classList.add('hidden');
        await loadScriptList();
    }

    // -- LIST VIEW ACTIONS --
    if (btnGenerate) {
        btnGenerate.onclick = async () => {
            const topic = topicInput.value.trim();
            try {
                UI.injectLoader('view-container', 'Đang thiết kế kịch bản & prompt kịch tính...');
                
                const systemPrompt = `Bạn là biên kịch chuyên nghiệp cho các video TikTok 3D Animation kịch tính (phong cách Disney/Pixar) về chủ đề "Mẹ chồng nàng dâu".
Nhiệm vụ: 
1. Tạo ra một kịch bản mâu thuẫn sâu sắc giữa Mẹ chồng và Con dâu.
2. Tạo ra 1 đoạn "Visual DNA" duy nhất dùng để sinh nhân vật đồng nhất cho tập phim này.

QUY TẮC KỊCH BẢN:
- Số lượng cảnh: 5-7 cảnh.
- Cấu trúc kịch bản: HOOK gây sốc -> Xung đột leo thang -> 2 cảnh Zoom cảm xúc -> Kết thúc bất ngờ/ý nghĩa.
- Nội dung thoại: TIẾNG VIỆT, kịch tính, ngắn gọn.

YÊU CẦU JSON:
{
  "title": "Tiêu đề hấp dẫn",
  "visual_dna": "Đoạn prompt mô tả nhân vật & bối cảnh dựa trên phong cách 3D Disney/Pixar, tả rõ cảm xúc chủ đạo của tập này (ví dụ: tức giận, thất vọng, âm mưu...)",
  "scenes": [
    {
      "scene_number": 1,
      "tag": "HOOK",
      "is_zoom": false,
      "zoom_target": null,
      "mil_dialogue": "Lời thoại mẹ chồng",
      "dil_dialogue": "Lời thoại con dâu",
      "mil_emotion": "Cảm xúc 3D Pixar (ví dụ: rage, evil smirk...)",
      "dil_emotion": "Cảm xúc 3D Pixar (ví dụ: teary eyes, defiance...)"
    }
  ]
}

THAM KHẢO CHARACTER BASE (Bạn phải biến tấu đoạn này vào visual_dna):
${CHARACTER_DNA_TEMPLATE}`;

                const userMessage = topic 
                    ? `Chủ đề mâu thuẫn: ${topic}` 
                    : `Hãy tự nghĩ ra một tình huống mâu thuẫn kịch tính ngẫu nhiên. Tình huống phải cực kỳ drama, gây sốc và lôi cuốn người xem ngay lập tức.`;

                const result = await OpenAIService.callAPI(systemPrompt, userMessage);
                
                if (result && result.scenes) {
                    const newId = await DBDocs.saveFamilyScript({
                        title: result.title || "Tập phim Mẹ chồng nàng dâu",
                        topic: topic,
                        visual_dna: result.visual_dna || CHARACTER_DNA_TEMPLATE,
                        scenes: result.scenes
                    });
                    
                    UI.showToast("Kịch bản mới đã được lưu!");
                    window.location.hash = `#/family-conflict/${newId}`;
                } else {
                    throw new Error("Không thể tạo kịch bản. Thử lại sau.");
                }
            } catch (e) {
                UI.showError(e.message);
            } finally {
                UI.removeLoader('view-container');
            }
        };
    }

    // Event delegation for List view
    if (scriptsGrid) {
        scriptsGrid.onclick = async (e) => {
            const deleteBtn = e.target.closest('.btn-delete-card');
            if (deleteBtn) {
                e.stopPropagation();
                const id = deleteBtn.getAttribute('data-id');
                
                UI.showModal({
                    title: "Xoá Kịch Bản",
                    bodyHTML: `<p>Bạn có chắc muốn xoá tập kịch bản này? Hành động này không thể hoàn tác.</p>`,
                    onConfirm: async (close) => {
                        try {
                            UI.injectLoader('scripts-grid', 'Đang xoá...');
                            await DBDocs.deleteFamilyScript(id);
                            close();
                            await loadScriptList();
                            UI.showToast("Đã xoá kịch bản.");
                        } catch (err) {
                            UI.showError("Không thể xoá.");
                        } finally {
                            UI.removeLoader('scripts-grid');
                        }
                    }
                });
                return;
            }

            const card = e.target.closest('.script-card');
            if (card) {
                const id = card.getAttribute('data-id');
                window.location.hash = `#/family-conflict/${id}`;
            }
        };
    }

    // -- DETAIL VIEW ACTIONS --
    if (btnBack) {
        btnBack.onclick = () => {
            window.location.hash = '#/family-conflict';
        };
    }

    async function loadScriptList() {
        const grid = document.getElementById('scripts-grid');
        if (!grid) return;

        try {
            grid.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải kịch bản...</div>';
            const scripts = await DBDocs.getFamilyScripts();
            
            if (scripts.length === 0) {
                grid.innerHTML = '';
                if (emptyHistory) emptyHistory.classList.remove('hidden');
                if (historyCount) historyCount.textContent = '0 tập';
                return;
            }

            if (emptyHistory) emptyHistory.classList.add('hidden');
            if (historyCount) historyCount.textContent = `${scripts.length} tập`;
            
            grid.innerHTML = scripts.map(s => `
                <div class="script-card card p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 border-primary group flex flex-col justify-between h-full" data-id="${s.id}">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <div class="text-[9px] text-primary font-bold uppercase tracking-widest bg-primary-light/50 px-2 py-0.5 rounded">Tập DRAMA</div>
                            <button class="btn-delete-card btn btn-sm text-gray hover:text-danger p-1 transition-colors" data-id="${s.id}" title="Xoá kịch bản">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                        <h4 class="font-bold text-gray-800 line-clamp-2 group-hover:text-primary transition-colors leading-tight">${s.title}</h4>
                        <p class="text-[10px] text-gray-400 mt-2"><i class="fa-solid fa-calendar-day"></i> ${new Date(s.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-[10px] text-primary font-bold uppercase">
                        <span>${s.scenes.length} cảnh quay</span>
                        <span class="opacity-0 group-hover:opacity-100 transition-opacity">Vào Xem <i class="fa-solid fa-arrow-right ml-1"></i></span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<div class="col-span-full py-10 text-center text-danger">Lỗi tải dữ liệu.</div>';
        }
    }

    async function loadScriptDetail(id) {
        try {
            const scripts = await DBDocs.getFamilyScripts();
            const script = scripts.find(s => s.id === id);
            if (!script) {
                UI.showError("Không tìm thấy kịch bản!");
                window.location.hash = '#/family-conflict';
                return;
            }

            // Header info
            document.getElementById('detail-title').textContent = script.title;
            document.getElementById('detail-date').textContent = new Date(script.createdAt).toLocaleString('vi-VN');
            
            const visualDna = script.visual_dna || CHARACTER_DNA_TEMPLATE;
            document.getElementById('detail-dna-text').textContent = visualDna;

            // Generate scene prompts
            const scenePrompts = script.scenes.map(s => {
                const titleScene = `🎬 SCENE ${s.scene_number}${s.tag ? ` – ${s.tag}` : ''}`;
                let sceneType = s.is_zoom 
                    ? `ZOOM SCENE:\n- Slow, subtle zoom-in on ${s.zoom_target === 'mil' ? 'LEFT (mother-in-law)' : 'RIGHT (daughter-in-law)'}` 
                    : `STRICT SCENE:\n- No zoom`;
                if (s.tag === 'KẾT') sceneType = "FINAL SCENE:\n- Minimal motion\n- Emotional pause 2–3 seconds";

                let dialogue = `Dialogue (Vietnamese):\n`;
                if (s.mil_dialogue) dialogue += `Mother-in-law (LEFT, ${s.mil_emotion}): "${s.mil_dialogue}"\n\n`;
                if (s.dil_dialogue) dialogue += `Daughter-in-law (RIGHT, ${s.dil_emotion}): "${s.dil_dialogue}"\n`;

                return `${titleScene}\n${SCENE_RULES}\n\n${sceneType}\n\n${dialogue}\n`;
            });

            // Render scenes
            const detailScenesContainer = document.getElementById('detail-scenes-container');
            detailScenesContainer.innerHTML = script.scenes.map((s, idx) => `
                <div class="card shadow-sm border-l-4 ${s.is_zoom ? 'border-warning' : 'border-primary'}">
                    <div class="card-header flex justify-between items-center bg-gray-50 py-2 px-4 shadow-sm">
                        <span class="font-bold text-gray-700">CẢNH ${s.scene_number} ${s.tag ? `<span class="badge badge-gray ml-2">${s.tag}</span>` : ''}</span>
                        <button class="btn btn-secondary btn-xs btn-copy-scene-detail" data-idx="${idx}">
                            <i class="fa-solid fa-copy"></i> Sao chép Prompt
                        </button>
                    </div>
                    <div class="card-body p-4 text-xs">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-2 rounded"><strong>Mẹ chồng:</strong> ${s.mil_dialogue}</div>
                            <div class="bg-gray-50 p-2 rounded"><strong>Con dâu:</strong> ${s.dil_dialogue}</div>
                        </div>
                        <textarea id="detail-scene-prompt-${idx}" class="hidden">${scenePrompts[idx]}</textarea>
                    </div>
                </div>
            `).join('');

            const fullText = visualDna + "\n\n" + scenePrompts.join('\n');
            document.getElementById('detail-full-prompt').textContent = fullText;

            // Events Delegation for Copy按钮
            detailScenesContainer.onclick = async (e) => {
                const btn = e.target.closest('.btn-copy-scene-detail');
                if (btn) {
                    const idx = btn.getAttribute('data-idx');
                    const text = document.getElementById(`detail-scene-prompt-${idx}`).value;
                    await UI.copyToClipboard(text, "Đã sao chép prompt cảnh!");
                }
            };

            document.getElementById('btn-copy-dna-detail').onclick = () => UI.copyToClipboard(visualDna, "Đã sao chép character DNA!");
            document.getElementById('btn-copy-full-detail').onclick = () => UI.copyToClipboard(fullText, "Đã sao chép toàn bộ prompt!");
            
            // Delete Detail pattern matches Dashboard edit pattern
            document.getElementById('btn-delete-detail').onclick = () => {
                UI.showModal({
                    title: "Xoá Kịch Bản",
                    bodyHTML: `<p>Bạn có chắc chắn muốn xoá vĩnh viễn kịch bản <strong>${script.title}</strong> không?</p>`,
                    onConfirm: async (close) => {
                        try {
                            UI.injectLoader('view-container', 'Đang xoá...');
                            await DBDocs.deleteFamilyScript(id);
                            close();
                            UI.showToast("Đã xoá thành công.");
                            window.location.hash = '#/family-conflict';
                        } catch(e) { UI.showError("Lỗi khi xoá"); }
                         finally { UI.removeLoader('view-container'); }
                    }
                });
            };

        } catch (e) {
            console.error(e);
            UI.showError("Lỗi tải chi tiết");
        }
    }
}
