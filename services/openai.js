import { Store } from './store.js';

export const OpenAIService = {
    async callAPI(systemPrompt, userMessage) {
        const apiKey = Store.getOpenAIKey();
        if (!apiKey) {
            throw new Error("Chưa cấu hình OpenAI API Key. Vui lòng vào Cài đặt để thêm.");
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o", // You can configure this to gpt-4-turbo or gpt-3.5-turbo
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Lỗi khi gọi API OpenAI");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch(e) {
            console.error("OpenAI không trả về JSON hợp lệ", content);
            throw new Error("Dữ liệu trả về từ AI bị lỗi định dạng.");
        }
    },

    // --- PROMPTS CHÍNH ---

    /**
     * 1. Tạo chiến lược tổng thể và danh sách video/tập
     */
    async generateStrategy(channelData) {
        const systemPrompt = `
Bạn là một chuyên gia sáng tạo nội dung TikTok hàng đầu. Hãy phân tích thông tin kênh và tạo ra một chiến lược nội dung hoàn chỉnh kèm danh sách video.
YÊU CẦU:
- Trả về CHUẨN JSON duy nhất.
- Ngôn ngữ: 100% Tiếng Việt thân thiện, rõ ràng.
- Chìa khóa JSON bắt buộc:
  "conceptName": (tên concept ấn tượng),
  "contentDirection": (1-2 câu định hướng),
  "pillars": [danh sách 3 mảng nội dung chính],
  "toneOfVoice": (giọng điệu),
  "visualStyle": (phong cách hình ảnh),
  "videos": [danh sách các video. Mỗi video gồm: id (string ngẫu nhiên), order (số thứ tự), title (tiêu đề), goal, summary, hook (câu mở đầu), cta]
Lưu ý: Nếu là Series thì các video phải có tính liên kết chặt chẽ.
`;
        const userMsg = `
Phân tích và lên chiến lược cho kênh TikTok sau:
- Tên kênh: ${channelData.name}
- Chủ đề: ${channelData.topic}
- Loại: ${channelData.type === 'series' ? 'Series nhiều tập liên tiếp' : 'Các video ngắn độc lập cùng chủ đề'}
- Mô tả: ${channelData.desc}
- Mục tiêu: ${channelData.goal}
- Đối tượng: ${channelData.audience}
- Số video muốn làm đợt này: ${channelData.videoCount}
`;
        return this.callAPI(systemPrompt, userMsg);
    },

    /**
     * 2. Tạo nội dung chi tiết theo từng cảnh quay (Scenes)
     */
    async generateVideoScenes(videoData, channelContext, characterBible = null) {
        const systemPrompt = `
Bạn là nhà biên kịch và đạo diễn quay dựng video ngắn.
Dựa vào kịch bản, hãy viết chi tiết cảnh quay làm input cho hệ thống video AI (VEO 3, Kling).

YÊU CẦU SỐ 1 - ĐỘ DÀI VÀ SỐ LƯỢNG CẢNH:
BẮT BUỘC phải phân rã kịch bản này ra thành mạch truyện dài từ 10 ĐẾN 20 CẢNH QUAY (Scenes) liên tục, logic và tiếp nối nhau để video có mạch truyện chi tiết.

YÊU CẦU SỐ 2 - ĐỒNG NHẤT NHÂN VẬT (CONSISTENCY):
Trong "veo3_prompt" (prompt tiếng Anh để vẽ video), khi nhân vật xuất hiện, bạn BẮT BUỘC COPY Y NGUYÊN dòng "Ngoại hình (look)" của nhân vật đó từ Character Bible và chèn vào prompt. KHÔNG được đổi từ, KHÔNG được viết lại. 
AI Video cần chuỗi text mô tả hoàn toàn giống nhau 100% ở mọi cảnh để giữ đúng 1 khuôn mặt.

CẤU TRÚC JSON DUY NHẤT TRẢ VỀ:
{"scenes": [{ "scene_number", "goal", "setting", "characters", "action", "emotion", "camera_angle", "lighting", "voice_over", "veo3_prompt" }]}

"veo3_prompt" phải bằng TÍẾNG ANH, tả rõ bối cảnh, góc máy, ánh sáng và hành động.
`;

        let bibleStr = '';
        if (characterBible && characterBible.length > 0) {
            bibleStr = 'CHARACTER BIBLE (TUYỆT ĐỐI CHÈN NGUYÊN VĂN PHẦN NGOẠI HÌNH VÀO VEO3_PROMPT LÚC NHÂN VẬT XUẤT HIỆN):\n';
            bibleStr += characterBible.map(c => `- Tên: ${c.name}\n  Ngoại hình: ${c.look}`).join('\n\n');
        }

        const userMsg = `
Ngữ cảnh kênh: ${channelContext.name} (${channelContext.topic}).
${bibleStr}

Hãy viết kịch bản chi tiết cho video sau:
- Tiêu đề: ${videoData.title}
- Hook: ${videoData.hook}
- Tóm tắt nội dung: ${videoData.summary}
- Thông điệp: ${videoData.goal}
`;
        return this.callAPI(systemPrompt, userMsg);
    },

    /**
     * 3. Tự động sinh Hồ sơ nhân vật
     */
    async generateCharacters(channelContext, strategyData) {
        const systemPrompt = `
Bạn là một chuyên gia casting và xây dựng hồ sơ nhân vật cho các Series phim ngắn TikTok.
Dựa vào định hướng kênh và chiến lược nội dung, hãy tự động sáng tạo ra danh sách các nhân vật chủ chốt.

YÊU CẦU:
- Trả về CHUẨN JSON duy nhất: {"characters": [{"name", "role", "age", "look", "personality", "note"}]}
- Tham số "look" (Ngoại hình) BẮT BUỘC viết bằng TIẾNG ANH thật chi tiết, chuẩn xác như một Prompt để nạp vào VEO 3, Midjourney. Mô tả kỹ khuôn mặt, trang phục, sắc tộc, độ tuổi.
- Tham số "name", "role", "age", "personality", "note" viết bằng TIẾNG VIỆT.
`;

        const userMsg = `
Phân tích và tự động tạo các nhân vật chính cho Series phim ngắn này.
- Kênh: ${channelContext.name} (${channelContext.topic})
- Khán giả: ${channelContext.audience}
- Concept: ${strategyData.conceptName || ''}
- Giọng điệu: ${strategyData.toneOfVoice || ''}
- Visual Style: ${strategyData.visualStyle || ''}
- Pillars (Nội dung chính): ${(strategyData.pillars||[]).join(', ')}

Hãy tạo cho tôi 2-3 nhân vật cốt lõi.
`;
        return this.callAPI(systemPrompt, userMsg);
    }
};
