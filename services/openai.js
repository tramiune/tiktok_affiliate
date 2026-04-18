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
- "characters": [Danh sách 2-3 nhân vật chính với: id, name (Tên Tiếng Việt), role, age, appearance_dna (Mô tả ngoại hình SIÊU CHI TIẾT bằng TIẾNG ANH bao gồm: Màu da/Skin, Ánh mắt/Eyes, Tóc tai/Hair, Khuôn mặt/Face, Chiều cao/Height, Trang phục/Outfit và Màu sắc trang phục/Outfit Color), personality, voice, note]
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
Bạn là đạo diễn phim TikTok chuyên về kịch tính và tâm lý. 
Nhiệm vụ: Phân rã tóm tắt thành 4-6 CẢNH QUAY chi tiết.

QUY TẮC "ULTRA STABILITY & CONSISTENCY":
1. BỐI CẢNH TỐI GIẢN (MINIMALIST SETTING): Mô tả 01 bối cảnh ĐƠN GIẢN, GỌN GÀNG bằng tiếng Anh (Locked Setting). Bối cảnh này sẽ dùng chung cho TẤT CẢ các cảnh.
2. NHÂN VẬT: Chỉ định rõ ai xuất hiện trong từng cảnh.
3. GIỌNG NÓI (VOICE): Gán đúng giọng nói (Alloy, Echo, v.v.) đã quy định cho nhân vật đang nói trong cảnh này.
4. QUY TẮC ĐỐI THOẠI: Mỗi cảnh PHẢI có lời thoại (voice_over). Các nhân vật phải nói chuyện liên tục từ đầu đến cuối video.
5. GLOBAL VISUAL LOCK (TRANG PHỤC): Nhân vật PHẢI mặc đúng bộ trang phục đã được mô tả trong Character Bible (Appearance DNA), tuyệt đối không được thay đổi, biến tấu hoặc thêm phụ kiện qua các cảnh. AI không được viết các hành động như "thay áo", "cởi khoác", "đeo thêm kính" nếu DNA gốc không có.

YÊU CẦU JSON:
{
  "locked_setting": "Mô tả bối cảnh chung (Locked Setting) bằng tiếng Anh",
  "scenes": [{ 
    "scene_number", "goal", "setting", "characters", "action", "voice_over", 
    "voice": "Tên giọng nói của nhân vật (PHẢI TRÙNG VỚI GIỌNG TRONG CHARACTER BIBLE)",
    "emotion": "Cảm xúc nhân vật"
  }],
  "copyright_advice": "Lời khuyên về bản quyền",
  "direction_for_editor": "Hướng dẫn dành cho dựng phim"
}
`;

        let bibleStr = '';
        if (characterBible && characterBible.length > 0) {
            bibleStr = 'DANH SÁCH NHÂN VẬT & GIỌNG NÓI (VOICE LIST):\n';
            bibleStr += characterBible.map(c => `- Tên: ${c.name}\n  Giọng nói: ${c.voice}\n  Ngoại hình: ${c.appearance_dna || c.look || 'Mô tả chung'}`).join('\n\n');
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
Bạn là chuyên gia thiết kế nhân vật hàng đầu thế giới cho AI Video.
Nhiệm vụ: Tạo dàn nhân vật TIẾNG VIỆT với mô tả ngoại hình SIÊU CHI TIẾT (DNA) (700-1000 từ mô tả tiếng Anh).

QUY TẮC BẮT BUỘC:
1. HYPER-DNA (700-1000 TỪ TIẾNG ANH): Mô tả cực kỳ tỉ mỉ từng milimet để AI không bao giờ vẽ sai:
   - Skin Color: Màu da cụ thể (ví dụ: Pale Ivory, Sun-kissed Olive, Deep Ebony).
   - Eyes: Màu mắt, ánh mắt, hình dáng mí mắt.
   - Hair: Kiểu tóc, độ dài, màu sắc, độ bóng, kết cấu tóc.
   - Face: Hình dáng khuôn mặt, các đặc điểm nổi bật (nốt ruồi, tàn nhang, cằm...).
   - Height/Build: Chiều cao và vóc dáng.
   - Outfit: Trang phục cụ thể (chất liệu, kiểu dáng, các lớp áo).
   - Outfit Color: Màu sắc TRANG PHỤC PHẢI CỐ ĐỊNH và DUY NHẤT.
2. MÀU SẮC NHẤT QUÁN: Quy định rõ MÀU SẮC trang phục và giữ nó không đổi.
3. GIỌNG NÓI (VOICE): Chọn 1 giọng OpenAI phù hợp cho mỗi nhân vật từ danh sách: [alloy, echo, fable, onyx, nova, shimmer].
- Nữ trẻ: nova, shimmer
- Nam trẻ/trung niên: alloy, echo
- Giọng trầm/phản diện: onyx
- Giọng kể chuyện/ấm áp: fable

CẤU TRÚC JSON:
{"characters": [{ "id", "name", "role", "age", "personality", "appearance_dna", "voice", "note" }]}
`;
        return { systemPrompt, userMessage: `Kênh: ${channelContext.name}\nChiến lược: ${strategyData.conceptName}\nHãy tạo 2-3 nhân vật với DNA 700-1000 từ và gán voice riêng biệt.` };
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
     * 3. Tạo nội dung chi tiết theo từng cảnh quay (Scenes) với quy trình 2 bước
     */
    async generateVideoScenes(videoData, channelContext, characterBible = null, onProgress = null) {
        if (onProgress) onProgress("Đang sinh khung kịch bản và bối cảnh chung...");
        
        const p = this.buildVideoScenesPrompt(videoData, channelContext, characterBible);
        const structure = await this.callAPI(p.systemPrompt, p.userMessage);
        
        if (!structure || !structure.scenes) {
            throw new Error("Không thể sinh khung kịch bản.");
        }

        const lockedSetting = structure.locked_setting || "A simple cinematic room background.";
        const totalScenes = structure.scenes.length;
        
        // Bước 2: Sinh Hyper Detailed Prompt cho từng cảnh
        const enhancedScenes = [];
        for (let i = 0; i < totalScenes; i++) {
            const scene = structure.scenes[i];
            if (onProgress) onProgress(`Đang sinh Prompt siêu chi tiết cho cảnh ${i + 1}/${totalScenes}...`);
            
            const veo3Prompt = await this.generateHyperDetailedPrompt(scene, characterBible, lockedSetting, videoData.title);
            
            enhancedScenes.push({
                ...scene,
                veo3_prompt: veo3Prompt,
                setting: lockedSetting, // Đảm bảo dùng chung 1 bối cảnh
                characters: String(scene.characters || "").replace(/undefined/g, "").trim()
            });
        }

        return {
            scenes: enhancedScenes,
            copyright_advice: structure.copyright_advice || '',
            direction_for_editor: structure.direction_for_editor || ''
        };
    },

    /**
     * Helper: Sinh Prompt VEO 3 "Hyper-Detailed" cho 1 cảnh quay
     */
    async generateHyperDetailedPrompt(scene, characterBible, lockedSetting, videoTitle) {
        const systemPrompt = `Bạn là chuyên gia viết Prompt cho AI Video (VEO 3.1) đỉnh cao thế giới.
Nhiệm vụ: Tạo ra một Prompt TIẾNG ANH cực kỳ dài, chi tiết và sống động (Hyper-Detailed).

PHONG CÁCH BẮT BUỘC: "3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character, 8k resolution, highly detailed textures."

QUY TẮC SIÊU CẤP:
1. LUÔN BẮT ĐẦU bằng Style Prefix ở trên.
2. [CRITICAL: VISUAL CONSISTENCY] CHÈN NGUYÊN VĂN Character DNA (nếu có) vào prompt. Phải nhắc lại màu sắc trang phục. NHÂN VẬT PHẢI MẶC ĐÚNG QUẦN ÁO TRONG DNA, KHÔNG THAY ĐỔI DÙ CHỈ MỘT CHI TIẾT NHỎ. 
3. EXPLICIT OUTFIT REMINDER: Trong nội dung prompt, hãy mô tả lại bộ quần áo của nhân vật (ví dụ: "wearing the exact same [color] [outfit] as specified in DNA") để AI Video generator không bị sai lệch.
4. BỐI CẢNH (Locked Setting): Phải sử dụng đúng 100% bối cảnh được cung cấp.
5. KHÔNG ZOOM: Bắt buộc thêm "Static camera, no zoom, wide shot or medium shot (depending on action), absolutely no camera movement."
6. CHI TIẾT ĐỐI THOẠI: Mô tả cực kỳ tỉ mỉ cử động môi khi nói, ánh mắt chuyển động, biểu cảm cơ mặt kịch tính tương ứng với lời thoại. Nhân vật phải nói chuyện sống động từ đầu đến cuối cảnh.
6. ĐỘ DÀI: Viết càng dài và chi tiết càng tốt để AI hiểu sâu sắc từng khung hình.

Trả về JSON: {"prompt": "nội dung prompt tiếng Anh siêu dài..."}`;

        let bibleStr = "";
        if (characterBible && characterBible.length > 0) {
            bibleStr = characterBible.map(c => `- ${c.name}: ${c.appearance_dna}`).join('\n');
        }

        const userMessage = `
Video: ${videoTitle}
Locked Setting: ${lockedSetting}

Cảnh quay cần sinh Prompt:
- Hành động: ${scene.action}
- Nhân vật xuất hiện: ${scene.characters}
- Lời thoại: ${scene.voice_over}
- Cảm xúc: ${scene.emotion}

Dàn DNA nhân vật để chèn vào prompt:
${bibleStr}
`;
        const res = await this.callAPI(systemPrompt, userMessage);
        return res.prompt || "";
    },

    /**
     * 4. Sinh lại duy nhất Prompt cho 1 cảnh quay (nếu bị thiếu)
     */
    async regenerateSingleScenePrompt(sceneData, videoTitle) {
        const systemPrompt = `Bạn là chuyên gia viết Prompt cho AI Video (VEO 3.1). 
PHONG CÁCH BẮT BUỘC: "3D Animation, Pixar/Disney style, vibrant colors, cinematic lighting, stylized character." 

QUY TẮC CỨNG:
1. Luôn BẮT ĐẦU prompt bằng Style Prefix ở trên.
2. [VISUAL LOCK] Chèn NGUYÊN VĂN mô tả nhân vật (Appearance DNA) vào ngay sau prefix. Nhân vật phải mặc đồ giống hệt DNA mô tả, không sai lệch màu sắc.
3. OUTFIT CONSISTENCY: Nhắc lại chi tiết trang phục trong prompt để khóa hình ảnh.
4. BỐI CẢNH (Background): Phải đồng nhất 100% với các cảnh khác trong cùng video. Sử dụng cùng một mô tả chi tiết.
5. TẬP TRUNG THOẠI: Mô tả biểu cảm khuôn mặt sống động và hành động nói chuyện liên tục.
5. BẮT BUỘC CUỐI PROMPT: "Dialogue: [nội dung lời thoại tiếng Việt]".

Trả về JSON: {"prompt": "nội dung prompt..."}`;
        
        const userMessage = `Video: ${videoTitle}\nCảnh quay: ${sceneData.action}\nBối cảnh: ${sceneData.setting}\nNhân vật: ${sceneData.characters}\nCảm xúc: ${sceneData.emotion}\nLời thoại (Việt): ${sceneData.voice_over || ''}`;
        
        const result = await this.callAPI(systemPrompt, userMessage);
        
        let p = result.prompt || "";
        if (typeof p === 'object' && p !== null) {
            p = p.text || p.content || p.prompt || JSON.stringify(p);
        }
        
        return String(p || "").trim();
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
     * @param {string} text 
     * @param {string} charVoice - Giọng nói cụ thể của nhân vật (tùy chọn)
     */
    async generateSpeech(text, charVoice = null) {
        const apiKey = Store.getOpenAIKey();
        const globalVoice = Store.getTTSType();
        const finalVoice = charVoice || globalVoice;
        
        if (!apiKey) throw new Error("Chưa cấu hình API Key");

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: finalVoice,
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
