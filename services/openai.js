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
        return await this.callAPI(systemPrompt, userMsg);
    },

    /**
     * 2. Tạo nội dung chi tiết theo từng cảnh quay
     */
    async generateVideoScenes(videoData, channelContext, characterBible = null) {
        const systemPrompt = `
Bạn là nhà biên kịch và đạo diễn quay dựng video dọc (TikTok).
Dựa vào kịch bản tóm tắt, hãy viết chi tiết từng cảnh quay để làm input cho hệ thống video generation AI (VEO 3).
YÊU CẦU:
- Trả về JSON duy nhất: {"scenes": [{ "scene_number", "goal", "setting", "characters", "action", "emotion", "camera_angle", "lighting", "voice_over", "veo3_prompt" }]}
- Trong đó "veo3_prompt" (prompt tiếng Anh chuẩn, chi tiết) để Gen image/video. Lưu ý VEO 3 cần miêu tả cụ thể không gian, góc máy, ánh sáng, hành động của nhân vật.
- Nếu có "Character Bible", BẮT BUỘC phải dùng định dạng ngoại hình nhân vật trong veo3_prompt để giữ vững sự đồng nhất nhân vật.
`;
        const userMsg = `
Ngữ cảnh kênh: ${channelContext.name} (${channelContext.topic}).
${characterBible ? 'Character Bible: ' + JSON.stringify(characterBible) : ''}
Hãy viết chi tiết các cảnh cho video:
- Tiêu đề: ${videoData.title}
- Hook: ${videoData.hook}
- Tóm tắt nội dung: ${videoData.summary}
- Thông điệp: ${videoData.goal}
`;
        return await this.callAPI(systemPrompt, userMsg);
    }
};
