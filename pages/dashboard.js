import { DBDocs } from '../services/firestore.js';
import { UI } from '../js/ui.js';

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
                <div class="card-header" style="border-bottom:none; padding-bottom: 0;">
                    <h3 class="text-primary truncate">${c.name}</h3>
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

    } catch(e) {
        console.error(e);
        UI.showError("Không thể tải danh sách kênh");
        listContainer.innerHTML = `<div class="empty-state text-danger" style="grid-column: 1 / -1;">Lỗi dữ liệu. Vui lòng làm mới trang.</div>`;
    }
}
