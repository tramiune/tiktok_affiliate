import { DBDocs } from '../services/firestore.js';
import { UI } from '../assets/js/ui.js';

export const title = 'Bảng điều khiển';

export const template = `
<div class="page-container">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2>Danh sách Kênh TikTok</h2>
            <p class="text-sm text-gray">Quản lý và lập chiến lược cho các kênh của bạn</p>
        </div>
        <a href="#/channel/create" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tạo kênh mới</a>
    </div>

    <div id="channel-list" class="grid-3">
        <!-- Render from JS -->
        <div class="loading-full w-full" style="grid-column: 1 / -1;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách...</div>
    </div>
</div>
`;

export async function init() {
    const listContainer = document.getElementById('channel-list');

    try {
        const channels = await DBDocs.getChannels();
        
        if (channels.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-layer-group"></i>
                    <h3>Chưa có kênh nào</h3>
                    <p>Hãy bắt đầu bằng cách tạo kênh mới và ứng dụng AI để sinh chiến lược!</p>
                    <a href="#/channel/create" class="btn btn-primary mt-4"><i class="fa-solid fa-plus"></i> Tạo Kênh Đầu Tiên</a>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = channels.map(c => `
            <div class="card channel-card">
                <div class="card-header flex justify-between items-start" style="border-bottom:none; padding-bottom: 0;">
                    <h3 class="text-primary truncate" style="max-width: 65%;">${c.name}</h3>
                    <div class="flex gap-2">
                        <button class="btn btn-sm text-gray edit-channel" data-id="${c.id}" title="Sửa kênh"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm text-gray text-danger delete-channel" data-id="${c.id}" title="Xóa kênh"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="text-sm text-gray mb-2"><strong>Chủ đề:</strong> ${c.topic}</p>
                    <p class="text-sm limit-2-lines">${c.desc}</p>
                    
                    <div class="channel-meta">
                        <span class="badge ${c.type === 'series' ? 'badge-purple' : 'badge-blue'}">
                            <i class="fa-solid ${c.type === 'series' ? 'fa-film' : 'fa-video'}"></i> ${c.type === 'series' ? 'Series' : 'Video độc lập'}
                        </span>
                        <span class="badge badge-gray">
                            ${c.status === 'draft' ? 'Nháp' : (c.status === 'planned' ? '<i class="fa-solid fa-check text-success"></i> Đã có kế hoạch' : 'Đang xử lý')}
                        </span>
                    </div>
                </div>
                <div class="card-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--color-gray-100); background: #f9fafb;">
                    <a href="#/channel/${c.id}" class="btn btn-secondary w-full">Vào Kênh <i class="fa-solid fa-arrow-right"></i></a>
                </div>
            </div>
        `).join('');

        // Setup Edit/Delete events
        document.querySelectorAll('.delete-channel').forEach(btn => {
            btn.onclick = () => {
                const cid = btn.getAttribute('data-id');
                const channel = channels.find(x => x.id === cid);
                UI.showModal({
                    title: "Xóa Dự Án",
                    bodyHTML: `<p>Bạn có chắc chắn muốn xóa kênh <strong>${channel.name}</strong> không? Hành động này không thể hoàn tác.</p>`,
                    onConfirm: async (close) => {
                        try {
                            UI.showFullLoader();
                            await DBDocs.deleteChannel(cid);
                            close();
                            init(); // Reload list
                            UI.showToast("Đã xóa kênh thành công.");
                        } catch(e) {
                            UI.showError(e.message);
                        }
                    }
                });
            };
        });

        document.querySelectorAll('.edit-channel').forEach(btn => {
            btn.onclick = () => {
                const cid = btn.getAttribute('data-id');
                const channel = channels.find(x => x.id === cid);
                UI.showModal({
                    title: "Sửa Kênh",
                    bodyHTML: `
                        <div class="form-group mb-2">
                            <label>Tên Kênh</label>
                            <input type="text" id="edit-name" class="form-control" value="${channel.name}">
                        </div>
                        <div class="form-group mb-2">
                            <label>Chủ đề</label>
                            <input type="text" id="edit-topic" class="form-control" value="${channel.topic}">
                        </div>
                        <div class="form-group mb-2">
                            <label>Mục tiêu</label>
                            <input type="text" id="edit-goal" class="form-control" value="${channel.goal || ''}">
                        </div>
                        <div class="form-group">
                            <label>Mô tả Format</label>
                            <textarea id="edit-desc" class="form-control" rows="3">${channel.desc || ''}</textarea>
                        </div>
                    `,
                    onConfirm: async (close) => {
                        try {
                            const name = document.getElementById('edit-name').value.trim();
                            const topic = document.getElementById('edit-topic').value.trim();
                            const goal = document.getElementById('edit-goal').value.trim();
                            const desc = document.getElementById('edit-desc').value.trim();
                            
                            if(!name) return UI.showError("Tên kênh không được để trống");
                            
                            UI.showFullLoader();
                            await DBDocs.updateChannel(cid, { name, topic, goal, desc });
                            close();
                            init();
                            UI.showToast("Cập nhật kênh thành công.");
                        } catch(e) {
                            UI.showError(e.message);
                        }
                    }
                });
            };
        });

    } catch(e) {
        console.error(e);
        UI.showError("Không thể tải danh sách kênh");
        listContainer.innerHTML = `<div class="empty-state text-danger" style="grid-column: 1 / -1;">Lỗi dữ liệu. Vui lòng làm mới trang.</div>`;
    }
}
