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
        const isSeries = channelData.type === 'series';
        
        const systemPrompt = `
Bạn là bậc thầy biên kịch trên TikTok. 
Nhiệm vụ: Tạo ra danh sách các ${isSeries ? 'tập phim trong một Series' : 'video độc lập'} hấp dẫn, tập trung vào đối thoại và tâm lý nhân vật.

QUY TẮC CỐT TRUYỆN (${isSeries ? 'CHẾ ĐỘ SERIES' : 'CHẾ ĐỘ ĐỘC LẬP'}):
1. MỞ ĐẦU GÂY SỐC (SHOCKING HOOK): Mỗi video PHẢI bắt đầu bằng một câu thoại hoặc tình huống gây sốc ngay giây đầu tiên.
2. TỔNG THỂ: Một mâu thuẫn được giải quyết chủ yếu qua lời thoại gay gắt.
${isSeries ? '3. CLIFFHANGER: Kết thúc video bằng một tình huống dở dang cao trào để người xem muốn xem tiếp tập sau.' : '3. KẾT THÚC TRỌN VẸN: Vì đây là video ĐỘC LẬP, mỗi video phải có một kết cục rõ ràng, giải quyết triệt để mâu thuẫn đã đặt ra trong video đó.'}

YÊU CẦU JSON:
{"videos": [{ 
    "id": "vid_X",
    "order", "title", "goal", "summary", 
    "hook": "Câu thoại/tình huống gây sốc ngay mở đầu", 
    "${isSeries ? 'cliffhanger' : 'conclusion'}": "${isSeries ? 'Tình tiết dở dang cao trào' : 'Cách mâu thuẫn được giải quyết trọn vẹn'}",
    "music_vibe": "Cinematic Tension, Aggressive Phonk, Sad Piano..."
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
        const isSeries = channelContext.type === 'series';
        
        const systemPrompt = `
Bạn là đạo diễn phim TikTok chuyên về kịch tính và tâm lý (Drama & Tension).
Nhiệm vụ: Phân rã tóm tắt thành 12-20 CẢNH QUAY cực kỳ căng thẳng.

QUY TẮC CỐT LÕI - HYPER QUALITY:
1. MỞ ĐẦU GÂY SỐC: Cảnh 1 phải là một "Cú tát" về mặt cảm xúc hoặc lời thoại gây sốc, tranh cãi nảy lửa ngay lập tức.
2. CĂNG THẲNG TỘI ĐA (MAX TENSION): Lời thoại phải gay gắt, dồn dập, đẩy mâu thuẫn lên đỉnh điểm.
3. BỐI CẢNH KHÓA CHẶT (LOCKED SETTING): Bạn phải mô tả bối cảnh thật chi tiết bằng TIẾNG ANH ở Scene 1 và COPY Y HỆT 100% cho 19 scene còn lại. Sự thay đổi dù là nhỏ nhất ở bối cảnh cũng không được phép.
4. CAMERA CỐ ĐỊNH (STEADY CAM): Dùng các góc quay cố định, góc máy đẹp để bắt trọn biểu cảm gương mặt. Tuyệt đối không nhảy góc máy lung tung.
5. CHI TIẾT LOGIC: Các đồ vật, phụ kiện PHẢI giữ nguyên vị trí xuyên suốt.

YÊU CẦU VIDEO PROMPT (VEO 3.1):
"3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character." + [Appearance DNA] + [Hành động & Biểu cảm chi tiết] + [Mô tả bối cảnh Locked].

CUỐI PROMPT: "Dialogue: [Lời thoại Tiếng Việt]".

YÊU CẦU JSON:
{
  "scenes": [{ "scene_number", "goal", "setting", "characters", "action", "voice_over", "veo3_prompt" }]
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
Bạn là chuyên gia thiết kế nhân vật cho AI Video (3D Animation) đẳng cấp thế giới.
Nhiệm vụ: Tạo dàn nhân vật TIẾNG VIỆT với sự đồng nhất tuyệt đối.

QUY TẮC "HYPER-CONSISTENT DNA":
Đối với mỗi nhân vật, phần "appearance_dna" PHẢI cực kỳ chi tiết (250-300 từ) theo 7 điểm sau:
1. MẮT: Hình dáng (almond, round), màu sắc (chi tiết đến con ngươi), hàng mi, biểu cảm mắt đặc trưng.
2. MŨI & MIỆNG: Hình dáng mũi (cao, thẳng, cánh mũi), hình dáng môi (dày, mỏng, cupid's bow).
3. KHUÔN MẶT: Hình dáng (oval, heart, square jawline), gò má, cằm, làn da (trắng hồng, mật ong, texture mịn).
4. TÓC: Kiểu tóc cụ thể, màu sắc (highlight, ombre nếu có), độ dài, texture (mượt, xoăn).
5. TRANG PHỤC CỐ ĐỊNH: Bộ đồ nhân vật LUÔN MẶC (mô tả từ áo, quần, giày, màu sắc, chất liệu vải).
6. PHỤ KIỆN: Một phụ kiện không bao giờ thay đổi (khuyên tai, vòng cổ, đồng hồ).
7. TUỔI & BIỂU CẢM GỐC: Tuổi cụ thể và thần thái đặc trưng (nghiêm nghị, hiền hậu, sắc sảo).

CẤU TRÚC JSON:
{"characters": [{ "id", "name", "role", "age", "personality", "appearance_dna", "note" }]}
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
