# AI TikTok Content Planner

Một ứng dụng Web App SaaS thu nhỏ giúp người lên ý tưởng và viết kịch bản hàng loạt cho kênh TikTok bằng sức mạnh của trí tuệ nhân tạo (OpenAI). Ứng dụng này sử dụng kiến trúc tĩnh hoàn toàn bằng mã HTML/CSS/JS thuần túy, và Backend dựa trên Firebase. Giao diện hiện đại, UX/UI thiết kế tối giản, sạch sẽ chuyên phục vụ làm năng suất.

## Cấu Trúc Mã Nguồn
- **`index.html`**: Entry chính duy nhất của ứng dụng.
- **`assets/`**: Chứa CSS và cấu trúc router cơ sở.
- **`services/`**: Các module tích hợp API và Database (Firebase, OpenAI, Store).
- **`pages/`**: Các view con được import tự động thông qua Hash Router.

## Hướng dẫn cài đặt & Chạy Local

### 1. Cấu hình Firebase
Hệ thống sử dụng **Google Sign-In** và **Firestore** để lưu kênh.
1. Lên [Firebase Console](https://console.firebase.google.com/), tạo một dự án mới.
2. Bật dịch vụ **Authentication** > **Google**.
3. Bật dịch vụ **Firestore Database**.
4. Vào Project Settings, copy đối tượng `firebaseConfig` và ghi đè vào file `services/firebase.js` (dòng 9).
5. Mặc định `services/firestore.js` đang sử dụng Mock LocalStorage nếu không có API Key thật. Nếu đã gắn key thật, ứng dụng sẽ tự chia ngã và gọi API thật.

### 2. Cấu hình OpenAI API Key
Bảo mật là yếu tố hàng đầu:
- Ứng dụng **không yêu cầu cứng API Key trong Code**.
- Bạn hãy khởi chạy ứng dụng ➔ Vào phần **Cài đặt AI & API** ➔ Nhập Key `sk-...` của bạn.
- Key sẽ được lưu bảo mật trong `LocalStorage` và dùng để điều khiển AI với các module prompt sẵn.

### 3. Chạy Server cục bộ (Local)
Vì dự án xây dựng thuần frontend và chia nhỏ bằng **ES Modules** (`import/export`), một số trình duyệt lớn sẽ chặn lỗi CORS khi mở thẳng file `index.html` dạng `file:///`.

Bạn có thể chạy dự án bằng cách sử dụng bất kỳ công cụ static server nào.

*Sử dụng VS Code:*
Cài Extension **"Live Server"** ➔ click phải vào `index.html` ➔ **Open with Live Server**.

*Sử dụng Node.js:*
\`\`\`bash
npx serve .
# Hoặc
npx http-server
\`\`\`

*Sử dụng Python:*
\`\`\`bash
python3 -m http.server 8000
# Sau đó mở http://localhost:8000
\`\`\`

### 4. Hướng dẫn Deploy lên GitHub Pages
Do ứng dụng này sử dụng **Hash Routing** (ví dụ `/#/dashboard`), nó hoạt động hoàn hảo trên GitHub Pages mà không gặp vấn đề rớt luồng 404 lỗi "Refresh Page" giống HTML5 History API.

1. Init Git và commit mã nguồn:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   \`\`\`
2. Push lên Github Repo mới.
3. Vào trang Repo trên Github ➔ **Settings** ➔ **Pages** ➔ Chọn nhánh (thường là `main` root) ➔ **Save**.
4. Đợi 1-2 phút, bạn sẽ có URL dạng `https://[username].github.io/[repo-name]/`.

## Ghi chú về Prompt VEO 3
Chương trình xuất Prompt video (VEO 3) tại màn hình sinh cảnh tự động nội suy từ file Character Bible. Đảm bảo nhân vật luôn sử dụng trang phục và style nhận diện gốc.
