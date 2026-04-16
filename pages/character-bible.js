import { DBDocs } from '../services/firestore.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Character Bible';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2><i class="fa-solid fa-users text-primary"></i> Quản lý Nhân vật</h2>
            <p class="text-sm text-gray">Thiết lập nhân vật để AI giữ được sự đồng nhất (Consistency) giữa các tập.</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-primary" id="btn-add-char"><i class="fa-solid fa-plus"></i> Thêm Nhân Vật</button>
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
                    <label>Mô tả Ngoại hình (Bắt buộc cho AI Video)</label>
                    <textarea id="char-look" class="form-control" rows="3" placeholder="Ví dụ: Tóc búi cao, đeo kính gọng đen, mặc áo dài hoa nhí..."></textarea>
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
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    list.classList.remove('hidden');
    empty.classList.add('hidden');

    list.innerHTML = characters.map((c, index) => `
        <div class="card char-card">
            <div class="card-body">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-primary">${c.name}</h3>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-icon edit-char" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-icon text-danger delete-char" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <p class="text-xs text-gray mb-2"><strong>Vai trò:</strong> ${c.role || 'N/A'} | ${c.age || ''}</p>
                <p class="text-sm mb-2"><strong>Ngoại hình:</strong> ${c.look || 'Chưa mô tả'}</p>
                <hr class="mb-2">
                <p class="text-xs"><strong>Tính cách:</strong> ${c.personality || 'N/A'}</p>
            </div>
        </div>
    `).join('');

    // Bind edit/delete
    document.querySelectorAll('.edit-char').forEach(btn => {
        btn.onclick = () => openModal(parseInt(btn.dataset.index));
    });
    document.querySelectorAll('.delete-char').forEach(btn => {
        btn.onclick = () => deleteChar(parseInt(btn.dataset.index));
    });
}

function setupEvents() {
    document.getElementById('btn-back-st').onclick = () => {
        window.location.hash = `#/channel/${currentChannelId}`;
    };

    document.getElementById('btn-add-char').onclick = () => openModal(-1);
    document.getElementById('close-modal').onclick = closeModal;
    document.getElementById('btn-cancel-char').onclick = closeModal;

    document.getElementById('char-form').onsubmit = async (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById('char-index').value);
        const data = {
            name: document.getElementById('char-name').value,
            role: document.getElementById('char-role').value,
            age: document.getElementById('char-age').value,
            look: document.getElementById('char-look').value,
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

function openModal(index = -1) {
    const modal = document.getElementById('char-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('char-form');
    
    document.getElementById('char-index').value = index;
    if(index === -1) {
        title.innerText = "Thêm Nhân Vật";
        form.reset();
    } else {
        title.innerText = "Sửa Nhân Vật";
        const c = characters[index];
        document.getElementById('char-name').value = c.name;
        document.getElementById('char-role').value = c.role;
        document.getElementById('char-age').value = c.age;
        document.getElementById('char-look').value = c.look;
        document.getElementById('char-personality').value = c.personality;
        document.getElementById('char-note').value = c.note;
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('char-modal').classList.remove('show');
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
