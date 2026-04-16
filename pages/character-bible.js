import { DBDocs } from '../services/firestore.js';
import { OpenAIService } from '../services/openai.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Hồ sơ nhân vật';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2><i class="fa-solid fa-users text-primary"></i> Hồ sơ Nhân vật</h2>
            <p class="text-sm text-gray">Thiết lập nhân vật để AI giữ được sự đồng nhất (Consistency) giữa các tập phim.</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-primary" id="btn-add-char"><i class="fa-solid fa-plus"></i> Thêm Nhân Vật</button>
            <button class="btn btn-secondary" id="btn-ai-gen-chars"><i class="fa-solid fa-wand-magic-sparkles"></i> Phóng tác bằng API</button>
            <button class="btn btn-secondary" id="btn-ai-gen-manual"><i class="fa-regular fa-comment-dots"></i> Dùng ChatGPT</button>
            <button class="btn btn-secondary" id="btn-back-st"><i class="fa-solid fa-arrow-left"></i> Về Chiến lược</button>
        </div>
    </div>

    <div class="grid-3" id="char-list">
        <!-- Characters render here -->
    </div>

    <div id="char-empty" class="empty-state hidden">
        <i class="fa-solid fa-user-slash"></i>
        <p>Chưa có nhân vật nào. Hãy thêm nhân vật đầu tiên cho series của bạn.</p>
    </div>
</div>

<!-- Modal Form -->
<div id="char-modal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h3 id="modal-title">Thêm Nhân Vật</h3>
            <span class="close" id="close-modal">&times;</span>
        </div>
        <div class="modal-body">
            <form id="char-form">
                <input type="hidden" id="char-index" value="-1">
                <div class="form-group">
                    <label>Tên nhân vật *</label>
                    <input type="text" id="char-name" class="form-control" placeholder="Ví dụ: Bà Mai, Nam, ..." required>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Vai trò</label>
                        <input type="text" id="char-role" class="form-control" placeholder="Ví dụ: Nhân vật chính, Mẹ chồng, ...">
                    </div>
                    <div class="form-group">
                        <label>Tuổi / Giới tính</label>
                        <input type="text" id="char-age" class="form-control" placeholder="Ví dụ: 50 tuổi, Nữ">
                    </div>
                </div>
                <div class="form-group">
                    <label>Appearance DNA (Mô tả kỹ thuật cho AI Video - Tiếng Anh)</label>
                    <textarea id="char-look" class="form-control" rows="4" placeholder="Ví dụ: 50-year-old Vietnamese woman, oval face, salt-and-pepper hair in a bun, wearing a turquoise brooch..."></textarea>
                    <div class="form-help">Phần này cực kỳ quan trọng để AI Video giữ đúng khuôn mặt nhân vật qua bộ kịch bản.</div>
                </div>
                <div class="form-group">
                    <label>Link Ảnh tham chiếu (Reference Image URL)</label>
                    <input type="text" id="char-image" class="form-control" placeholder="https://example.com/character-face.jpg">
                    <div class="form-help">Dán link ảnh khuôn mặt nhân vật để làm "Neo hình ảnh" cho AI Video.</div>
                </div>
                <div class="form-group">
                    <label>Tính cách / Giọng điệu</label>
                    <input type="text" id="char-personality" class="form-control" placeholder="Ví dụ: Khắt khe nhưng thương con, nói giọng miền Bắc...">
                </div>
                <div class="form-group">
                    <label>Ghi chú quan trọng khác</label>
                    <textarea id="char-note" class="form-control" rows="2" placeholder="Luôn cầm theo túi xách màu đỏ..."></textarea>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-char">Hủy</button>
                    <button type="submit" class="btn btn-primary">Lưu Nhân Vật</button>
                </div>
            </form>
        </div>
    </div>
</div>
`;

let currentChannelId = null;
let characters = [];

export async function init(params) {
    currentChannelId = params.channelId;
    if(!currentChannelId) {
        window.location.hash = '#/dashboard';
        return;
    }

    try {
        UI.showFullLoader();
        characters = await DBDocs.getCharacterBible(currentChannelId);
        
        // Render template back after loader
        document.getElementById('view-container').innerHTML = template;
        
        renderCharacters();
        setupEvents();
    } catch (e) {
        UI.showError(e.message);
    }
}

function renderCharacters() {
    const list = document.getElementById('char-list');
    const empty = document.getElementById('char-empty');

    if(characters.length === 0) {
        if(list) list.classList.add('hidden');
        if(empty) empty.classList.remove('hidden');
        return;
    }

    if(list) list.classList.remove('hidden');
    if(empty) empty.classList.add('hidden');
    
    list.innerHTML = characters.map((c, index) => {
        const dna = c.appearance_dna || c.look || 'Chưa có DNA';
        return `
        <div class="card char-card">
            ${c.imageUrl ? `<div class="char-image-preview"><img src="${c.imageUrl}" alt="${c.name}"></div>` : ''}
            <div class="card-body">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-primary">${c.name}</h3>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-icon edit-char" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-icon text-danger delete-char" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <p class="text-xs text-gray mb-2"><strong>Vai trò:</strong> ${c.role || 'Chưa rõ'} | ${c.age || ''}</p>
                
                <div class="dna-box">
                    <div class="dna-label text-xs uppercase mb-1">Appearance DNA (VEO 3.1)</div>
                    <p class="text-xs font-mono text-gray-700">${dna}</p>
                </div>

                <hr class="my-2">
                <p class="text-xs"><strong>Tính cách:</strong> ${c.personality || 'Chưa rõ'}</p>
            </div>
        </div>
    `}).join('');

    // Bind edit/delete
    document.querySelectorAll('.edit-char').forEach(btn => {
        btn.onclick = () => openModal(parseInt(btn.dataset.index));
    });
    document.querySelectorAll('.delete-char').forEach(btn => {
        btn.onclick = () => deleteChar(parseInt(btn.dataset.index));
    });
}

function setupEvents() {
    const btnBackSt = document.getElementById('btn-back-st');
    if(btnBackSt) {
        btnBackSt.onclick = () => {
            window.location.hash = `#/channel/${currentChannelId}`;
        };
    }

    const btnAddChar = document.getElementById('btn-add-char');
    if(btnAddChar) btnAddChar.onclick = () => openModal(-1);
    
    const btnAiGen = document.getElementById('btn-ai-gen-chars');
    if(btnAiGen) {
        btnAiGen.onclick = async () => {
            if(characters.length > 0) {
                if(!confirm("Kênh này đã có nhân vật. Nếu AI tự tạo mới sẽ nối thêm vào danh sách hiện tại. Bạn có muốn tiếp tục không?")) return;
            }
            try {
                UI.setHTML('char-list', '');
                UI.setHTML('char-empty', '<div class="loading-full"><i class="fa-solid fa-wand-magic-sparkles fa-spin text-primary"></i> AI đang phân tích chiến lược và phóng tác dàn nhân vật... Vui lòng chờ 15 giây.</div>');
                if(document.getElementById('char-empty')) document.getElementById('char-empty').classList.remove('hidden');

                const channel = await DBDocs.getChannel(currentChannelId);
                const strategy = await DBDocs.getStrategy(currentChannelId);
                const response = await OpenAIService.generateCharacters(channel, strategy);
                
                if(response && response.characters) {
                    characters = characters.concat(response.characters);
                    await DBDocs.saveCharacterBible(currentChannelId, characters);
                    renderCharacters();
                    UI.showToast("Đã phóng tác dàn nhân vật thành công!");
                } else {
                    throw new Error("Không nhận được dữ liệu hợp lệ.");
                }
            } catch (e) {
                UI.showError("Lỗi AI: " + e.message);
                renderCharacters(); // Khôi phục lại list cũ nếu lỗi
            }
        };
    }

    const btnAiGenManual = document.getElementById('btn-ai-gen-manual');
    if(btnAiGenManual) {
        btnAiGenManual.onclick = async () => {
            if(characters.length > 0) {
                if(!confirm("Kênh này đã có nhân vật. Nếu AI tạo thêm thủ công sẽ nối vào danh sách hiện tại. Tiếp tục?")) return;
            }
            try {
                UI.showFullLoader();
                const channel = await DBDocs.getChannel(currentChannelId);
                const strategy = await DBDocs.getStrategy(currentChannelId);
                
                // Hide loader, show modal
                UI.setHTML('view-container', template); // restore template visually quickly, though not strictly needed here
                
                const p = OpenAIService.buildCharactersPrompt(channel, strategy);
                const combined = p.systemPrompt + "\\n\\n" + p.userMessage;
                
                UI.showManualAIModal({
                    title: "Phóng tác Nhân vật qua ChatGPT",
                    promptText: combined,
                    onConfirm: async (parsedData, close) => {
                        try {
                            if(parsedData && parsedData.characters) {
                                characters = characters.concat(parsedData.characters);
                                await DBDocs.saveCharacterBible(currentChannelId, characters);
                                renderCharacters();
                                UI.showToast("Đã nhập thành công dàn nhân vật thủ công!");
                                close();
                            } else {
                                throw new Error("Key 'characters' không tồn tại trong JSON trả về.");
                            }
                        } catch(e) {
                            UI.showError("Lỗi dữ liệu: " + e.message);
                        }
                    }
                });
            } catch(e) {
                UI.showError(e.message);
            }
            // rebind to avoid UI wipe issues
            renderCharacters();
            setupEvents();
        };
    }
    
    const closeModalBtn = document.getElementById('close-modal');
    if(closeModalBtn) closeModalBtn.onclick = closeModal;
    
    const cancelCharBtn = document.getElementById('btn-cancel-char');
    if(cancelCharBtn) cancelCharBtn.onclick = closeModal;

    const charForm = document.getElementById('char-form');
    if(charForm) {
        charForm.onsubmit = async (e) => {
            e.preventDefault();
            const index = parseInt(document.getElementById('char-index').value);
            const data = {
                name: document.getElementById('char-name').value,
                role: document.getElementById('char-role').value,
                age: document.getElementById('char-age').value,
                appearance_dna: document.getElementById('char-look').value,
                imageUrl: document.getElementById('char-image').value,
                personality: document.getElementById('char-personality').value,
                note: document.getElementById('char-note').value,
            };

            if(index === -1) {
                characters.push(data);
            } else {
                characters[index] = data;
            }

            try {
                await DBDocs.saveCharacterBible(currentChannelId, characters);
                closeModal();
                renderCharacters();
                UI.showToast("Đã lưu nhân vật");
            } catch (e) {
                UI.showError(e.message);
            }
        };
    }
}

function openModal(index = -1) {
    const modal = document.getElementById('char-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('char-form');
    
    document.getElementById('char-index').value = index;
    if(index === -1) {
        if(title) title.innerText = "Thêm Nhân Vật";
        if(form) form.reset();
    } else {
        if(title) title.innerText = "Sửa Nhân Vật";
        const c = characters[index];
        const nameEl = document.getElementById('char-name');
        if(nameEl) nameEl.value = c.name;
        const roleEl = document.getElementById('char-role');
        if(roleEl) roleEl.value = c.role;
        const ageEl = document.getElementById('char-age');
        if(ageEl) ageEl.value = c.age;
        const lookEl = document.getElementById('char-look');
        if(lookEl) lookEl.value = c.appearance_dna || c.look || '';
        const imageEl = document.getElementById('char-image');
        if(imageEl) imageEl.value = c.imageUrl || '';
        const personalityEl = document.getElementById('char-personality');
        if(personalityEl) personalityEl.value = c.personality;
        const noteEl = document.getElementById('char-note');
        if(noteEl) noteEl.value = c.note || '';
    }
    
    if(modal) modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('char-modal');
    if(modal) modal.classList.remove('show');
}

async function deleteChar(index) {
    if(!confirm("Bạn có chắc chắn muốn xóa nhân vật này?")) return;
    characters.splice(index, 1);
    try {
        await DBDocs.saveCharacterBible(currentChannelId, characters);
        renderCharacters();
        UI.showToast("Đã xóa nhân vật");
    } catch (e) {
        UI.showError(e.message);
    }
}
