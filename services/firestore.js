import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, orderBy, deleteDoc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseService } from './firebase.js';
import { Store } from './store.js';

// Fallback Mock System dùng LocalStorage nếu chưa có Firebase thật
const getStorage = (key) => JSON.parse(localStorage.getItem('mock_db_' + key) || '[]');
const setStorage = (key, data) => localStorage.setItem('mock_db_' + key, JSON.stringify(data));
const generateId = () => Math.random().toString(36).substr(2, 9);

function getUser() {
    const user = Store.getCurrentUser();
    if(!user) throw new Error("Chưa đăng nhập");
    return user;
}

/**
 * Service quản lý Database (Firestore thực tế hoặc fallback localstorage)
 */
export const DBDocs = {
    
    // -- LẤY DANH SÁCH CHANNELS --
    getChannels: async function() {
        const user = getUser();
        if(FirebaseService.isMockUser()) {
            return getStorage('channels').filter(c => c.ownerId === user.uid).sort((a,b) => b.createdAt - a.createdAt);
        }
        
        const q = query(collection(FirebaseService.getDb(), "channels"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
    },
    
    // -- TẠO KÊNH MỚI --
    createChannel: async function(channelData) {
        const user = getUser();
        const payload = {
            ...channelData,
            ownerId: user.uid,
            status: 'draft', // draft, plahned, working
            createdAt: Date.now(),
        };
        
        if(FirebaseService.isMockUser()) {
            const list = getStorage('channels');
            const id = generateId();
            list.push({ id, ...payload });
            setStorage('channels', list);
            return id;
        }
        
        const ref = await addDoc(collection(FirebaseService.getDb(), "channels"), payload);
        return ref.id;
    },
    
    // -- LẤY THÔNG TIN CHANNELS --
    getChannel: async function(id) {
        if(FirebaseService.isMockUser()) {
            return getStorage('channels').find(c => c.id === id);
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "channels", id));
        if(snap.exists()) return { id: snap.id, ...snap.data() };
        return null;
    },

    // -- CẬP NHẬT KÊNH --
    updateChannel: async function(id, data) {
        if(FirebaseService.isMockUser()) {
            const list = getStorage('channels');
            const idx = list.findIndex(c => c.id === id);
            if(idx > -1) {
                list[idx] = { ...list[idx], ...data };
                setStorage('channels', list);
            }
            return true;
        }
        await updateDoc(doc(FirebaseService.getDb(), "channels", id), data);
        return true;
    },

    // -- XOÁ KÊNH --
    deleteChannel: async function(id) {
        if(FirebaseService.isMockUser()) {
            let list = getStorage('channels').filter(c => c.id !== id);
            setStorage('channels', list);
            return true;
        }
        await deleteDoc(doc(FirebaseService.getDb(), "channels", id));
        return true;
    },

    // -- LƯU CHIẾN LƯỢC --
    saveStrategy: async function(channelId, strategyData) {
        if(FirebaseService.isMockUser()) {
            const list = getStorage('strategies').filter(s => s.channelId !== channelId);
            list.push({ channelId, data: strategyData });
            setStorage('strategies', list);
            
            // Update channel status
            let channels = getStorage('channels');
            let idx = channels.findIndex(c => c.id === channelId);
            if(idx > -1) { channels[idx].status = 'planned'; setStorage('channels', channels); }
            return true;
        }
        await updateDoc(doc(FirebaseService.getDb(), "channels", channelId), { status: 'planned' });
        await setDoc(doc(FirebaseService.getDb(), "strategies", channelId), { channelId, data: strategyData });
        return true;
    },
    
    // -- LẤY CHIẾN LƯỢC --
    getStrategy: async function(channelId) {
        if(FirebaseService.isMockUser()) {
            const item = getStorage('strategies').find(s => s.channelId === channelId);
            return item ? item.data : null;
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "strategies", channelId));
        if(snap.exists()) {
            return snap.data().data;
        }
        return null;
    },

    // -- LƯU CHARACTER BIBLE --
    saveCharacterBible: async function(channelId, characters) {
        if(FirebaseService.isMockUser()) {
            const list = getStorage('character_bibles').filter(cb => cb.channelId !== channelId);
            list.push({ channelId, characters });
            setStorage('character_bibles', list);
            return true;
        }
        await setDoc(doc(FirebaseService.getDb(), "character_bibles", channelId), { channelId, characters });
        return true;
    },

    // -- LẤY CHARACTER BIBLE --
    getCharacterBible: async function(channelId) {
        if(FirebaseService.isMockUser()) {
            const item = getStorage('character_bibles').find(cb => cb.channelId === channelId);
            return item ? item.characters : [];
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "character_bibles", channelId));
        return snap.exists() ? snap.data().characters : [];
    },

    // -- LƯU VIDEO SCENES --
    saveVideoScenes: async function(channelId, videoId, scenes) {
        const docId = `${channelId}_${videoId}`;
        if(FirebaseService.isMockUser()) {
            const list = getStorage('video_scenes').filter(vs => vs.id !== docId);
            list.push({ id: docId, channelId, videoId, scenes });
            setStorage('video_scenes', list);
            return true;
        }
        await setDoc(doc(FirebaseService.getDb(), "video_scenes", docId), { channelId, videoId, scenes });
        return true;
    },

    // -- LẤY VIDEO SCENES --
    getVideoScenes: async function(channelId, videoId) {
        const docId = `${channelId}_${videoId}`;
        if(FirebaseService.isMockUser()) {
            const item = getStorage('video_scenes').find(vs => vs.id === docId);
            return item ? item.scenes : null;
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "video_scenes", docId));
        return snap.exists() ? snap.data().scenes : null;
    },

    // -- QUẢN LÝ MẸ CHỒNG NÀNG DÂU SCRIPTS --
    getFamilyScripts: async function() {
        const user = getUser();
        if(FirebaseService.isMockUser()) {
            return getStorage('family_scripts')
                    .filter(s => s.ownerId === user.uid)
                    .sort((a,b) => b.createdAt - a.createdAt);
        }
        
        const q = query(
            collection(FirebaseService.getDb(), "family_scripts"), 
            where("ownerId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
    },

    subscribeFamilyScripts: function(callback) {
        const user = Store.getCurrentUser();
        if (!user) return () => {};
        
        if (FirebaseService.isMockUser()) {
            // Simple mock subscription using an interval for local development
            const interval = setInterval(() => {
                const scripts = getStorage('family_scripts')
                    .filter(s => s.ownerId === user.uid)
                    .sort((a,b) => b.createdAt - a.createdAt);
                callback(scripts);
            }, 1000);
            return () => clearInterval(interval);
        }

        const q = query(
            collection(FirebaseService.getDb(), "family_scripts"), 
            where("ownerId", "==", user.uid)
        );
        
        return onSnapshot(q, (snap) => {
            const scripts = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a,b) => b.createdAt - a.createdAt);
            callback(scripts);
        }, (err) => {
            console.error("Firestore Subscribe Error:", err);
        });
    },

    saveFamilyScript: async function(scriptData) {
        const user = getUser();
        const payload = {
            ...scriptData,
            ownerId: user.uid,
            createdAt: Date.now()
        };

        if(FirebaseService.isMockUser()) {
            const list = getStorage('family_scripts');
            const id = scriptData.id || generateId();
            const idx = list.findIndex(s => s.id === id);
            
            if (idx > -1) {
                list[idx] = { ...list[idx], ...payload, id };
            } else {
                list.push({ id, ...payload });
            }
            
            setStorage('family_scripts', list);
            return id;
        }

        if (scriptData.id) {
            await setDoc(doc(FirebaseService.getDb(), "family_scripts", scriptData.id), payload);
            return scriptData.id;
        } else {
            const ref = await addDoc(collection(FirebaseService.getDb(), "family_scripts"), payload);
            return ref.id;
        }
    },

    deleteFamilyScript: async function(id) {
        if(FirebaseService.isMockUser()) {
            const list = getStorage('family_scripts').filter(s => s.id !== id);
            setStorage('family_scripts', list);
            return true;
        }
        await deleteDoc(doc(FirebaseService.getDb(), "family_scripts", id));
        return true;
    }
};
