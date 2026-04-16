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
1. AN TOÀN BẢN QUYỀN (COPYRIGHT): Tuyệt đối không sử dụng tên thật của người nổi tiếng, không mô phỏng quá giống các bộ phim có sẵn. Mọi nhân vật và cốt truyện phải là sáng tạo mới hoàn toàn.
2. CHIẾN THUẬT SERIES: Phải xác định một "Bí ẩn lớn" (The Big Mystery) hoặc "Mục tiêu dài hạn" kéo dài xuyên suốt các tập để tạo sự tò mò.
3. GIỮ CHÂN: Luôn ưu tiên yếu tố kịch tính, bất ngờ và nhịp độ nhanh.
4. PHONG CÁCH HÌNH ẢNH MẶC ĐỊNH: HOẠT HÌNH 3D (3D Animation, Pixar/Disney style). Đây là quy tắc cứng: Tuyệt đối KHÔNG sử dụng phong cách thực tế (Realistic) hay người thật. Mọi mô tả hình ảnh phải tuân theo phong cách này.

YÊU CẦU JSON:
- Trả về CHUẨN JSON.
- "conceptName": (tên concept ấn tượng),
- "contentDirection": (1-2 câu định hướng),
- "bigMystery": (Vấn đề hoặc bí ẩn lớn nhất xuyên suốt cả series 40 tập),
- "pillars": [danh sách 3 mảng nội dung chính],
- "toneOfVoice": (giọng điệu),
- "visualStyle": (phong cách hình ảnh),
- "characters": [Danh sách đúng 2-3 nhân vật chính (KHÔNG ĐƯỢC NHIỀU HƠN 3) với: id (chuỗi duy nhất, ví dụ: char_1), name, role, age, appearance_dna (Ngoại hình tả bằng TIẾNG ANH CHI TIẾT theo style hoạt hình), personality, note]
`;
        const userMessage = `
Phân tích và lên chiến lược cho kênh TikTok sau:
- Tên kênh: ${channelData.name}
- Chủ đề: ${channelData.topic}
- Loại: ${channelData.type === 'series' ? 'Series nhiều tập liên tiếp' : 'Các video ngắn độc lập cùng chủ đề'}
- Mô tả: ${channelData.desc}
- Mục tiêu: ${channelData.goal}
- Đối tượng: ${channelData.audience}

Hãy tập trung xây dựng Concept và dàn nhân vật (chỉ 2-3 nhân vật trọng tâm) thật đặc sắc và có tính nhất quán cao.
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
Nhiệm vụ: Phân rã tóm tắt thành kịch bản 8 -12 cảnh quay chi tiết.

YÊU CẦU SỐ 1 - MẠCH TRUYỆN:
BẮT BUỘC phân rã kịch bản này ra thành 8 ĐẾN 12 CẢNH QUAY (Scenes) liên tục, kịch tính.

YÊU CẦU SỐ 2 - VIDEO PROMPT (VEO 3.1):
Thuộc tính "veo3_prompt" PHẢI bắt đầu bằng cụm từ cố định sau để đảm bảo đồng nhất:
"3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character."

- QUY TẮC BỐI CẢNH (SETTINGS): Trong một tập phim, hãy giới hạn chỉ sử dụng tối đa 2-3 bối cảnh chính (ví dụ: trong nhà, ngoài sân). Hãy tái sử dụng mô tả bối cảnh giống hệt nhau để AI Video không vẽ ra các phòng khác nhau.
- QUY TẮC CỨNG: Tuyệt đối không sử dụng các từ liên quan đến thực tế như: "realistic", "photorealistic", "8k", "photography", "real person".
- Nếu có nhân vật: Bạn phải chèn NGUYÊN VĂN đoạn "Appearance DNA" của nhân vật đó vào ngay sau Style Prefix. KHÔNG ĐƯỢC tự ý tóm tắt hay thay đổi ngoại hình của họ giữa các cảnh.
- Mô tả hành động và bối cảnh: Viết bằng TIẾNG ANH sống động, chi tiết về góc máy và ánh sáng.
- CUỐI QUY TẮC PROMPT: Bắt đầu bằng chữ "Dialogue:" và chèn phần lời thoại (voice_over) của cảnh đó. 
- QUAN TRỌNG NHẤT: Phần lời thoại sau chữ "Dialogue:" PHẢI viết bằng TIẾNG VIỆT có dấu.

YÊU CẦU SỐ 3 - NÚT THẮT Dở DANG (CLIFFHANGER):
Cảnh cuối cùng (Scene 8 -12) PHẢI thực hiện đúng phần "cliffhanger" đã định hướng. Nó phải kết thúc ở đoạn cao trào nhất, hoặc một câu hỏi bỏ ngỏ, không được kết thúc trọn vẹn. 

YÊU CẦU SỐ 4 - LỜI THOẠI (VOICE OVER):
Toàn bộ thuộc tính "voice_over" trong JSON PHẢI được viết bằng TIẾNG VIỆT tự nhiên, lôi cuốn, đúng phong cách TikTok.

VÍ DỤ CÂU PROMPT HỢP LỆ (DÀNH CHO VEO3_PROMPT):
"3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character. A cute orange cat with big expressive eyes, fluffy fur, wearing a small blue collar. The cat is standing on a wooden table looking surprised inside a cozy sunlit kitchen with white tiles. Dialogue: Con mèo này lạ quá, sao nó lại nhìn mình như thế nhỉ?"

YÊU CẦU ĐỊNH DẠNG:
Trả về duy nhất một đối tượng JSON theo cấu trúc sau:
{
  "scenes": [{ 
    "scene_number", 
    "goal", 
    "setting", 
    "characters", 
    "action", 
    "emotion", 
    "camera_angle", 
    "lighting", 
    "voice_over", 
    "veo3_prompt" 
  }],
  "copyright_advice": "...",
  "direction_for_editor": "..."
}
BẮT BUỘC: Không bao giờ bỏ trống "veo3_prompt". Toàn bộ LỜI THOẠI (Dialogue) trong prompt PHẢI LÀ TIẾNG VIỆT CÓ DẤU. Toàn bộ phong cách PHẢI là Hoạt hình 3D. Giới hạn bối cảnh tối đa 2-3 địa điểm.
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
Bạn là chuyên gia thiết kế nhân vật cho AI Video (Veo, Kling, Runway). 
Nhiệm vụ của bạn là dựa trên chiến lược kênh để phóng tác dàn nhân vật chi tiết.

QUY TẮC QUAN TRỌNG NHẤT - APPEARANCE DNA:
Đối với mỗi nhân vật, phần "appearance_dna" (ngoại hình) phải được viết bằng TIẾNG ANH cực kỳ chi tiết, bao gồm:
1. Chủng tộc và tuổi cụ thể.
2. TẠO HÌNH HOẠT HÌNH: Mô tả nhân vật theo phong cách 3D Animation (eyes slightly larger, expressive features, vibrant textures). Tuyệt đối không tả kiểu người thật.
3. Cấu trúc khuôn mặt (ví dụ: oval face, high cheekbones, deep-set eyes, thin lips).
4. Đặc điểm tóc và màu sắc.
5. Trang phục mặc định (luôn mặc bộ đồ này để giữ đồng nhất).
6. MỘT PHỤ KIỆN DUY NHẤT.

Mục tiêu là mô tả sao cho AI Video chỉ cần đọc đoạn này là vẽ ra đúng 1 người duy nhất theo phong cách HOẠT HÌNH 3D.

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
Tuyệt đối KHÔNG sử dụng phong cách thực tế (Realistic).

QUY TẮC CỨNG:
1. Luôn BẮT ĐẦU prompt bằng Style Prefix ở trên.
2. Chèn NGUYÊN VĂN mô tả nhân vật (nội dung trong Appearance DNA) vào ngay sau prefix.
3. Không tự ý thay đổi các đặc điểm nhận dạng của nhân vật giữa các cảnh.
4. Bối cảnh (Background): Phải đồng nhất với các cảnh khác trong cùng video. Sử dụng cùng một mô tả nếu bối cảnh giống nhau.
5. BẮT BUỘC CUỐI PROMPT: Phải có phần lời thoại tiếng Việt định dạng: "Dialogue: [nội dung lời thoại tiếng Việt]".

Trả về kết quả dưới định dạng JSON: {"prompt": "nội dung prompt..."}`;
        
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
