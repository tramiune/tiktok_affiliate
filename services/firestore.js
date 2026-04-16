import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, orderBy, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
    async getChannels() {
        const user = getUser();
        if(FirebaseService.isMockUser()) {
            return getStorage('channels').filter(c => c.ownerId === user.uid).sort((a,b) => b.createdAt - a.createdAt);
        }
        
        const q = query(collection(FirebaseService.getDb(), "channels"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
    },
    
    // -- TẠO KÊNH MỚI --
    async createChannel(channelData) {
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
    async getChannel(id) {
        if(FirebaseService.isMockUser()) {
            return getStorage('channels').find(c => c.id === id);
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "channels", id));
        if(snap.exists()) return { id: snap.id, ...snap.data() };
        return null;
    },

    // -- LƯU CHIẾN LƯỢC --
    async saveStrategy(channelId, strategyData) {
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
    async getStrategy(channelId) {
        if(FirebaseService.isMockUser()) {
            const item = getStorage('strategies').find(s => s.channelId === channelId);
            return item ? item.data : null;
        }
        const snap = await getDoc(doc(FirebaseService.getDb(), "strategies", channelId));
        if(snap.exists()) {
            return snap.data().data;
        }
        return null;
    }

    // (Vì code giới hạn, các module dưới sẽ mock LocalStorage để test chạy được, thay firestore logic trong prod).
};
