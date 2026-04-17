import { Store } from './store.js';

export const OpenAIService = {
    async callAPI(systemPrompt, userMessage) {
        const apiKey = Store.getOpenAIKey();
        if (!apiKey) {
            throw new Error("Chưa cấu hình OpenAI API Key. Vui lòng vào Cài đặt để thêm.");
        }

        // Đảm bảo luôn có từ "json" trong tin nhắn để không bị lỗi OpenAI JSON Mode
        const enhancedSystemPrompt = systemPrompt + "\n\nIMPORTANT: Your response MUST be a valid JSON object.";

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
                    { role: "system", content: enhancedSystemPrompt },
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
1. TÊN NHÂN VẬT: Phải là TÊN TIẾNG VIỆT thực tế, gần gũi (ví dụ: Lan, Minh, Bà Tư, Anh Hải...).
2. AN TOÀN BẢN QUYỀN (COPYRIGHT): Tuyệt đối không sử dụng tên thật của người nổi tiếng.
3. CHIẾN THUẬT SERIES: Phải xác định một "Bí ẩn lớn" hoặc "Mục tiêu dài hạn" kéo dài xuyên suốt các tập.
4. PHONG CÁCH HÌNH ẢNH: HOẠT HÌNH 3D (3D Animation, Pixar/Disney style). Đây là quy tắc cứng.
5. SỰ ĐỒNG NHẤT: Mọi nhân vật phải có một bộ NGOẠI HÌNH CỐ ĐỊNH (Appearance DNA) mô tả bằng tiếng Anh cực kỳ chi tiết.

YÊU CẦU JSON:
- "conceptName": (tên concept ấn tượng),
- "contentDirection": (định hướng cốt truyện),
- "bigMystery": (Vấn đề hoặc bí ẩn lớn nhất xuyên suốt cả series),
- "pillars": [3 mảng nội dung chính],
- "toneOfVoice": (giọng điệu),
- "visualStyle": "3D Animation, Pixar Style",
- "characters": [Danh sách 2-3 nhân vật chính với: id, name (Tên Tiếng Việt), role, age, appearance_dna (Mô tả ngoại hình CHI TIẾT bằng TIẾNG ANH để AI vẽ chuẩn), personality, note]
`;
        const userMessage = `
Phân tích và lên chiến lược cho kênh TikTok:
- Tên kênh: ${channelData.name}
- Chủ đề: ${channelData.topic}
- Loại: ${channelData.type === 'series' ? 'Series nhiều tập liên tiếp' : 'Các video ngắn độc lập cùng chủ đề'}
- Mô tả: ${channelData.desc}

Hãy tập trung xây dựng Concept và dàn nhân vật (Tên Tiếng Việt) thật đặc sắc và có tính nhất quán cao.
`;
        return { systemPrompt, userMessage };
    },

    buildVideosBatchPrompt(channelData, strategy, characters, previousVideos = [], startOrder = 1, count = 10) {
        const systemPrompt = `
Bạn là bậc thầy biên kịch Series ngắn trên TikTok. 
Nhiệm vụ: Tạo ra danh sách các tập phim hấp dẫn, tập trung vào đối thoại (Dialogue-driven) và tâm lý nhân vật.

QUY TẮC CỐT TRUYỆN:
1. MỖI TẬP PHIM: Phải có 1 mâu thuẫn hoặc 1 tình huống thú vị được giải quyết chủ yếu qua lời thoại.
2. CLIFFHANGER: Kết thúc tập phim bằng một câu hỏi hoặc tình huống dở dang để người xem muốn xem tập tiếp theo.
3. NHẤT QUÁN: Nhân vật phải giữ vững tính cách qua từng tập.

YÊU CẦU JSON:
{"videos": [{ 
    "id": "vid_X",
    "order", "title", "goal", "summary", 
    "hook": "Câu mở đầu gây sốc hoặc tò mò", 
    "cliffhanger": "Tình tiết dở dang",
    "music_vibe": "Cinematic Tension, Slow Emotional, v.v."
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
Bạn là nhà biên kịch và đạo diễn quay dựng video TikTok chuyên nghiệp.
Nhiệm vụ: Phân rã tóm tắt thành kịch bản 8-12 cảnh quay chi tiết, tập trung vào ĐỐI THOẠI.

QUY TẮC CỐT LÕI - SỰ ĐỒNG NHẤT TUYỆT ĐỐI:
1. MỘT BỐI CẢNH DUY NHẤT (SINGLE SETTING): Toàn bộ các cảnh trong cùng một tập phim PHẢI diễn ra tại 1 địa điểm duy nhất (ví dụ: trong phòng khách, tại bàn ăn, hoặc dưới gốc cây). KHÔNG ĐƯỢC thay đổi bối cảnh giữa các cảnh. Hãy mô tả bối cảnh này thật chi tiết bằng TIẾNG ANH trong scene đầu tiên và dùng y hệt mô tả đó cho các cảnh tiếp theo.
2. NHÂN VẬT ĐỒNG NHẤT: Bạn phải chèn NGUYÊN VĂN đoạn "Appearance DNA" (Mô tả ngoại hình tiếng Anh) của nhân vật vào prompt. KHÔNG ĐƯỢC tự ý tóm tắt.
3. TẬP TRUNG THOẠI: Video chủ yếu là các nhân vật nói chuyện với nhau. Hãy mô tả biểu cảm khuôn mặt (biểu cảm, cử chỉ môi, ánh mắt) thật chi tiết.

YÊU CẦU VIDEO PROMPT (VEO 3.1):
Thuộc tính "veo3_prompt" PHẢI bắt đầu bằng:
"3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character."
Sau đó là Appearance DNA của các nhân vật có mặt, rồi đến mô tả hành động/biểu cảm, và COPPY Y HỆT mô tả bối cảnh (setting description).

CUỐI PROMPT: Bắt đầu bằng chữ "Dialogue:" và chèn phần lời thoại bằng TIẾNG VIỆT có dấu.

YÊU CẦU JSON:
{
  "scenes": [{ 
    "scene_number", 
    "goal", 
    "setting": "Mô tả bối cảnh (Giống hệt nhau cho mọi cảnh)", 
    "characters": "Tên nhân vật (Tiếng Việt)", 
    "action": "Hành động/Biểu cảm", 
    "voice_over": "Lời thoại Tiếng Việt", 
    "veo3_prompt": "Prompt VEO 3 hoàn chỉnh (Tiếng Anh + Dialogue Tiếng Việt)" 
  }]
}
`;

        let bibleStr = '';
        if (characterBible && characterBible.length > 0) {
            bibleStr = 'CHIẾN LƯỢC NHÂN VẬT SERIES (CHỈ CHỌN NHÂN VẬT CẦN THIẾT CHO TẬP NÀY):\n';
            bibleStr += characterBible.map(c => `- Tên: ${c.name}\n  Ngoại hình: ${c.appearance_dna || c.look || 'Mô tả chung'}`).join('\n\n');
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
Bạn là chuyên gia thiết kế nhân vật cho AI Video (3D Animation).
Nhiệm vụ: Tạo dàn nhân vật đặc sắc, có TÊN TIẾNG VIỆT.

QUY TẮC APPEARANCE DNA:
Đối với mỗi nhân vật, phần "appearance_dna" PHẢI viết bằng TIẾNG ANH cực kỳ chi tiết (150-200 từ), bao gồm:
1. TẠO HÌNH HOẠT HÌNH: 3D Animation style, Pixar-like eyes and expressions.
2. CHI TIẾT KHUÔN MẶT: Hình dáng mặt, mũi, môi, đặc điểm da.
3. TÓC & PHỤ KIỆN: Màu sắc, kiểu tóc, phụ kiện đặc trưng.
4. TRANG PHỤC CỐ ĐỊNH: Mô tả bộ đồ nhân vật luôn mặc để giữ đồng nhất.

Mục tiêu là mô tả sao cho AI chỉ cần đọc đoạn này là vẽ ra đúng 1 người duy nhất, không thay đổi.

CẤU TRÚC JSON:
{"characters": [{ "id", "name" (Tiếng Việt), "role", "age", "personality", "appearance_dna", "note" }]}
`;

        const userMessage = `
Kênh: ${channelContext.name} (${channelContext.topic})
Định hướng nội dung: ${strategyData.concept}
Hãy tạo ra 2-3 nhân vật chính đặc sắc nhất cho series này.
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
        const result = await this.callAPI(p.systemPrompt, p.userMessage);
        
        // Normalization: Đảm bảo các field quan trọng luôn tồn tại
        if (result && result.scenes) {
            result.scenes = result.scenes.map(s => {
                let p = s.veo3_prompt || "";
                if (!p) {
                    // Tìm bất kỳ key nào chứa chữ "prompt" (không phân biệt hoa thường)
                    const keys = Object.keys(s);
                    const promptKey = keys.find(k => k.toLowerCase().includes('prompt'));
                    if (promptKey) p = s[promptKey];
                }
                return {
                    ...s,
                    veo3_prompt: p,
                    characters: String(s.characters || "").replace(/undefined/g, "")
                };
            });
        }
        return result;
    },

    /**
     * 4. Sinh lại duy nhất Prompt cho 1 cảnh quay (nếu bị thiếu)
     */
    async regenerateSingleScenePrompt(sceneData, videoTitle) {
        const systemPrompt = `Bạn là chuyên gia viết Prompt cho AI Video (VEO 3.1). 
PHONG CÁCH BẮT BUỘC: "3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character." 

QUY TẮC CỨNG:
1. Luôn BẮT ĐẦU prompt bằng Style Prefix ở trên.
2. Chèn NGUYÊN VĂN mô tả nhân vật (Appearance DNA) vào ngay sau prefix.
3. BỐI CẢNH (Background): Phải đồng nhất 100% với các cảnh khác trong cùng video. Sử dụng cùng một mô tả chi tiết.
4. TẬP TRUNG THOẠI: Mô tả biểu cảm khuôn mặt và hành động nói chuyện.
5. BẮT BUỘC CUỐI PROMPT: "Dialogue: [nội dung lời thoại tiếng Việt]".

Trả về JSON: {"prompt": "nội dung prompt..."}`;
        
        const userMessage = `Video: ${videoTitle}\nCảnh quay: ${sceneData.action}\nBối cảnh: ${sceneData.setting}\nNhân vật: ${sceneData.characters}\nCảm xúc: ${sceneData.emotion}\nLời thoại (Việt): ${sceneData.voice_over || ''}`;
        
        const result = await this.callAPI(systemPrompt, userMessage);
        return result.prompt || "";
    },

    /**
     * 4. Tự động sinh Hồ sơ nhân vật (dùng riêng biệt nếu cần)
     */
    async generateCharacters(channelContext, strategyData) {
        const p = this.buildCharactersPrompt(channelContext, strategyData);
        return this.callAPI(p.systemPrompt, p.userMessage);
    },

    /**
     * 5. Sinh giọng nói AI (Text-To-Speech)
     * Trả về Blob URL để chơi ngay lập tức
     */
    async generateSpeech(text) {
        const apiKey = Store.getOpenAIKey();
        const voice = Store.getTTSType();
        
        if (!apiKey) throw new Error("Chưa cấu hình API Key");

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: voice,
                input: text
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Lỗi khi tạo giọng nói AI");
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
};
