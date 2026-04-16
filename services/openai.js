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
Bạn là một chuyên gia sáng tạo nội dung TikTok hàng đầu, am hiểu thuật toán giữ chân (Retention) và tâm lý đám đông.
Nhiệm vụ của bạn là tạo ra một chiến lược kênh hoàn chỉnh, độc bản và lôi cuốn.

QUY TẮC CỐT LÕI:
1. AN TOÀN BẢN QUYỀN (COPYRIGHT): Tuyệt đối không sử dụng tên thật của người nổi tiếng, không mô phỏng quá giống các bộ phim có sẵn. Mọi nhân vật và cốt truyện phải là sáng tạo mới hoàn toàn.
2. CHIẾN THUẬT SERIES: Phải xác định một "Bí ẩn lớn" (The Big Mystery) hoặc "Mục tiêu dài hạn" kéo dài xuyên suốt các tập để tạo sự tò mò.
3. GIỮ CHÂN: Luôn ưu tiên yếu tố kịch tính, bất ngờ và nhịp độ nhanh.

YÊU CẦU JSON:
- Trả về CHUẨN JSON.
- "conceptName": (tên concept ấn tượng),
- "contentDirection": (1-2 câu định hướng),
- "bigMystery": (Vấn đề hoặc bí ẩn lớn nhất xuyên suốt cả series 40 tập),
- "pillars": [danh sách 3 mảng nội dung chính],
- "toneOfVoice": (giọng điệu),
- "visualStyle": (phong cách hình ảnh),
- "characters": [Danh sách 3-5 nhân vật chính với: id (chuỗi duy nhất, ví dụ: char_1), name, role, age, appearance_dna (Ngoại hình tả bằng TIẾNG ANH CHI TIẾT), personality, note]
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
Bạn là bậc thầy biên kịch Series ngắn (Short-form Series), am hiểu kỹ thuật Cliffhanger (nút thắt cuối tập) để giữ chân người xem.
Nghiêm túc tuân thủ: Không bao giờ viết một tập phim có kết thúc quá trọn vẹn và êm đềm.

QUY TẮC GIỮ CHÂN (RETENTION):
1. MỖI TẬP PHIM phải kết thúc bằng một "Cliffhanger" (Nút thắt dở dang, một cú sảy chân, một bí mật bị lộ, hoặc một lời đe dọa).
2. TỔNG THỂ mượt mà: Tập N kết thúc dở dang ở đâu thì tập N+1 phải bắt đầu bằng việc giải quyết nút thắt đó ngay lập tức (Xử lý Hook mạnh).

YÊU CẦU JSON:
{"videos": [{ 
    "id": "chuỗi duy nhất vd: vid_1",
    "order", "title", "goal", "summary", 
    "hook": "Câu mở đầu gây sốc hoặc tò mò", 
    "cliffhanger": "Tình tiết dở dang ở cuối tập để ép người xem xem tập sau",
    "music_vibe": "Loại nhạc thương mại TikTok gợi ý (ví dụ: Cinematic Tension, Fast Phonk, Sad Piano...)"
}]}
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
Bạn là nhà biên kịch và đạo diễn quay dựng video ngắn chuyên nghiệp cho kênh TikTok "Triệu view".
Nhiệm vụ: Phân rã tóm tắt thành kịch bản 15-20 cảnh quay chi tiết.

YÊU CẦU SỐ 1 - MẠCH TRUYỆN:
BẮT BUỘC phân rã kịch bản này ra thành 15 ĐẾN 20 CẢNH QUAY (Scenes) liên tục, kịch tính.

YÊU CẦU SỐ 2 - ĐỒNG NHẤT NHÂN VẬT:
Luôn chèn NGUYÊN VĂN "Appearance DNA" vào thuộc tính "veo3_prompt" khi nhân vật xuất hiện.

YÊU CẦU SỐ 3 - NÚT THẮT DỞ DANG (CLIFFHANGER):
Cảnh cuối cùng (Scene 15-20) PHẢI thực hiện đúng phần "cliffhanger" đã định hướng. Nó phải kết thúc ở đoạn cao trào nhất, hoặc một câu hỏi bỏ ngỏ, không được kết thúc trọn vẹn. 

YÊU CẦU SỐ 4 - AN TOÀN BẢN QUYỀN:
Tuyệt đối không sử dụng tên thật, bài hát có bản quyền hay thương hiệu lớn trong kịch bản.

CẤU TRÚC JSON DUY NHẤT TRẢ VỀ:
{
  "scenes": [{ "scene_number", "goal", "setting", "characters", "action", "emotion", "camera_angle", "lighting", "voice_over", "veo3_prompt" }],
  "copyright_advice": "Lời khuyên chọn nhạc không dính bản quyền từ TikTok Commercial Library",
  "direction_for_editor": "Mẹo dựng phim để tăng tương tác ở tập phim này (ví dụ: dùng hiệu ứng zoom, cắt nhanh...)"
}
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
Bạn là chuyên gia thiết kế nhân vật cho AI Video (Veo, Kling, Runway). 
Nhiệm vụ của bạn là dựa trên chiến lược kênh để phóng tác dàn nhân vật chi tiết.

QUY TẮC QUAN TRỌNG NHẤT - APPEARANCE DNA:
Đối với mỗi nhân vật, phần "appearance_dna" (ngoại hình) phải được viết bằng TIẾNG ANH cực kỳ chi tiết, bao gồm:
1. Chủng tộc và tuổi cụ thể (ví dụ: Vietnamese woman, late 50s).
2. Cấu trúc khuôn mặt (ví dụ: oval face, high cheekbones, deep-set eyes, thin lips).
3. Đặc điểm tóc và màu sắc (ví dụ: salt-and-pepper hair tied in a tight bun).
4. Trang phục mặc định (luôn mặc bộ đồ này để giữ đồng nhất).
5. MỘT PHỤ KIỆN DUY NHẤT (ví dụ: một chiếc trâm cài tóc bằng bạc, hoặc nốt ruồi ở cằm).

Mục tiêu là mô tả sao cho AI Video chỉ cần đọc đoạn này là vẽ ra đúng 1 người duy nhất.

CẤU TRÚC JSON:
{"characters": [{ "id", "name", "role", "age", "personality", "appearance_dna", "note" }]}
`;

        const userMessage = `
Kênh: ${channelContext.name} (${channelContext.topic})
Định hướng nội dung: ${strategyData.concept}
Dàn nhân vật cần thiết cho phong cách này là gì? Hãy phóng tác chi tiết.
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
