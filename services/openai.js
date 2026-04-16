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

    // --- PROMPT BUILDERS ---
    
    buildStrategyPrompt(channelData) {
        const systemPrompt = `
Bạn là một chuyên gia sáng tạo nội dung TikTok hàng đầu. Hãy phân tích thông tin kênh và tạo ra một chiến lược nội dung hoàn chỉnh kèm dàn nhân vật cốt lõi (chỉ dành cho Series).

YÊU CẦU:
- Trả về CHUẨN JSON duy nhất.
- Ngôn ngữ: 100% Tiếng Việt thân thiện, rõ ràng.
- Chìa khóa JSON bắt buộc:
  "conceptName": (tên concept ấn tượng),
  "contentDirection": (1-2 câu định hướng),
  "pillars": [danh sách 3 mảng nội dung chính],
  "toneOfVoice": (giọng điệu),
  "visualStyle": (phong cách hình ảnh),
  "characters": [Danh sách 3-5 nhân vật chính (nếu là Series). Mỗi nhân vật gồm: name, role, age, look (Ngoại hình tả bằng TIẾNG ANH chi tiết cho AI Video), personality, note]
`;
        const userMessage = `
Phân tích và lên chiến lược cho kênh TikTok sau:
- Tên kênh: ${channelData.name}
- Chủ đề: ${channelData.topic}
- Loại: ${channelData.type === 'series' ? 'Series nhiều tập liên tiếp' : 'Các video ngắn độc lập cùng chủ đề'}
- Mô tả: ${channelData.desc}
- Mục tiêu: ${channelData.goal}
- Đối tượng: ${channelData.audience}

Hãy tập trung xây dựng Concept và dàn nhân vật thật đặc sắc và có tính nhất quán cao.
`;
        return { systemPrompt, userMessage };
    },

    buildVideosBatchPrompt(channelData, strategy, characters, previousVideos = [], startOrder = 1, count = 10) {
        const systemPrompt = `
Bạn là biên kịch TikTok chuyên nghiệp. Dựa trên Chiến lược và dàn Nhân vật đã có, hãy viết tiếp kịch bản cho các tập tiếp theo.

YÊU CẦU:
- Trả về CHUẨN JSON: {"videos": [{"id", "order", "title", "goal", "summary", "hook", "cta"}]}
- Phải bám sát tính cách và ngoại hình nhân vật đã định nghĩa.
- Nếu là Series, các tập phải có mạch liên kết logic.
- Không lặp lại nội dung của các tập trước đó.
`;
        
        let charStr = "";
        if(characters && characters.length > 0) {
            charStr = "\nDÀN NHÂN VẬT CHỐT:\n" + characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n');
        }

        let prevStr = "";
        if(previousVideos && previousVideos.length > 0) {
            prevStr = "\nCÁC TẬP ĐÃ CÓ (ĐỪNG VIẾT TRÙNG):\n" + previousVideos.slice(-5).map(v => `- Tập ${v.order}: ${v.title}`).join('\n');
        }

        const userMessage = `
HÃY VIẾT TIẾP ${count} TẬP PHIM (Bắt đầu từ số thứ tự ${startOrder}).
- Concept: ${strategy.conceptName || ''}
- Định hướng: ${strategy.contentDirection || ''}
${charStr}
${prevStr}

Lưu ý: Viết tiêu đề và tóm tắt lôi cuốn, đúng phong cách TikTok.
`;
        return { systemPrompt, userMessage };
    },

    buildVideoScenesPrompt(videoData, channelContext, characterBible = null) {
        const systemPrompt = `
Bạn là nhà biên kịch và đạo diễn quay dựng video ngắn chuyên nghiệp.
Dựa vào kịch bản, hãy viết chi tiết cảnh quay làm kịch bản hình ảnh (Storyboard) cho hệ thống video AI (VEO 3, Kling).

YÊU CẦU SỐ 1 - ĐỘ DÀI VÀ SỐ LƯỢNG CẢNH:
BẮT BUỘC phải phân rã kịch bản này ra thành mạch truyện dài từ 15 ĐẾN 20 CẢNH QUAY (Scenes) liên tục, logic và tiếp nối nhau.

YÊU CẦU SỐ 2 - CHỌN LỌC NHÂN VẬT (CHARACTER SELECTION):
- Dưới đây là "Character Bible" (Hồ sơ nhân vật) của toàn bộ series. 
- Đối với video cụ thể này, bạn chỉ được CHỌN và SỬ DỤNG những nhân vật thực sự liên quan đến nội dung của tập này. 
- TUYỆT ĐỐI KHÔNG đưa tất cả nhân vật vào nếu cốt truyện không yêu cầu.

YÊU CẦU SỐ 3 - ĐỒNG NHẤT NHÂN VẬT (CONSISTENCY):
Trong "veo3_prompt" (prompt tiếng Anh), khi một nhân vật xuất hiện, bạn BẮT BUỘC COPY Y NGUYÊN dòng "Ngoại hình (look)" của nhân vật đó từ hồ sơ và chèn vào prompt. KHÔNG được đổi từ. AI video cần text mô tả giống nhau 100% để giữ đúng 1 khuôn mặt.

CẤU TRÚC JSON DUY NHẤT TRẢ VỀ:
{"scenes": [{ "scene_number", "goal", "setting", "characters", "action", "emotion", "camera_angle", "lighting", "voice_over", "veo3_prompt" }]}

"veo3_prompt" phải bằng TÍẾNG ANH, tả rõ bối cảnh, góc máy, ánh sáng và hành động.
`;

        let bibleStr = '';
        if (characterBible && characterBible.length > 0) {
            bibleStr = 'CHIẾN LƯỢC NHÂN VẬT SERIES (CHỈ CHỌN NHÂN VẬT CẦN THIẾT CHO TẬP NÀY):\n';
            bibleStr += characterBible.map(c => `- Tên: ${c.name}\n  Ngoại hình: ${c.look}`).join('\n\n');
        }

        const userMessage = `
Ngữ cảnh kênh: ${channelContext.name} (${channelContext.topic}).
${bibleStr}

Hãy viết kịch bản cảnh quay chi tiết cho tập phim sau:
- Tiêu đề: ${videoData.title}
- Hook: ${videoData.hook}
- Tóm tắt nội dung: ${videoData.summary}
- Thông điệp cần truyền tải: ${videoData.goal}
`;
        return { systemPrompt, userMessage };
    },

    buildCharactersPrompt(channelContext, strategyData) {
        const systemPrompt = `
Bạn là một chuyên gia casting và xây dựng hồ sơ nhân vật cho các Series phim ngắn TikTok.
Dựa vào định hướng kênh và chiến lược nội dung, hãy tự động sáng tạo ra danh sách các nhân vật chủ chốt.

YÊU CẦU:
- Trả về CHUẨN JSON duy nhất: {"characters": [{"name", "role", "age", "look", "personality", "note"}]}
- Tham số "look" (Ngoại hình) BẮT BUỘC viết bằng TIẾNG ANH thật chi tiết, chuẩn xác như một Prompt để nạp vào VEO 3, Midjourney. Mô tả kỹ khuôn mặt, trang phục, sắc tộc, độ tuổi.
- Tham số "name", "role", "age", "personality", "note" viết bằng TIẾNG VIỆT.
`;

        const userMessage = `
Phân tích và tự động tạo các nhân vật chính cho Series phim ngắn này.
- Kênh: ${channelContext.name} (${channelContext.topic})
- Khán giả: ${channelContext.audience}
- Concept: ${strategyData.conceptName || ''}
- Giọng điệu: ${strategyData.toneOfVoice || ''}
- Visual Style: ${strategyData.visualStyle || ''}
- Pillars (Nội dung chính): ${(strategyData.pillars||[]).join(', ')}

Hãy tạo cho tôi 3-5 nhân vật cốt lõi.
`;
        return { systemPrompt, userMessage };
    },

    // --- PROMPTS CHÍNH ---

    /**
     * 1. Tạo chiến lược tổng thể và dàn nhân vật (Foundation)
     */
    async generateStrategy(channelData) {
        const p = this.buildStrategyPrompt(channelData);
        return this.callAPI(p.systemPrompt, p.userMessage);
    },

    /**
     * 2. Tạo một đợt video mới dựa trên context cũ
     */
    async generateVideosBatch(channelData, strategy, characters, previousVideos, startOrder, count) {
        const p = this.buildVideosBatchPrompt(channelData, strategy, characters, previousVideos, startOrder, count);
        return this.callAPI(p.systemPrompt, p.userMessage);
    },

    /**
     * 3. Tạo nội dung chi tiết theo từng cảnh quay (Scenes)
     */
    async generateVideoScenes(videoData, channelContext, characterBible = null) {
        const p = this.buildVideoScenesPrompt(videoData, channelContext, characterBible);
        return this.callAPI(p.systemPrompt, p.userMessage);
    },

    /**
     * 4. Tự động sinh Hồ sơ nhân vật (dùng riêng biệt nếu cần)
     */
    async generateCharacters(channelContext, strategyData) {
        const p = this.buildCharactersPrompt(channelContext, strategyData);
        return this.callAPI(p.systemPrompt, p.userMessage);
    }
};
