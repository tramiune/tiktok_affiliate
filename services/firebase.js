import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Store } from './store.js';

/**
 * MOCK FIREBASE CONFIG
 * Yêu cầu người dùng thay block này bằng Config thật từ Firebase console.
 */
const firebaseConfig = {
  apiKey: "AIzaSy_MOCK_KEY_PLEASE_CHANGE",
  authDomain: "mock-project.firebaseapp.com",
  projectId: "mock-project",
  storageBucket: "mock-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let app, auth, db;
let mockMode = false; // Bật lên nếu firebaseConfig = mock

export const FirebaseService = {
  init() {
    try {
      if(firebaseConfig.apiKey.includes('MOCK_KEY')) {
        console.warn("Đang sử dụng Mock Firebase Config. Các chức năng lưu trên DB sẽ chạy ở Mode MOCK bằng LocalStorage nếu bạn bật Mock.");
        mockMode = true; // For fallback testing UI without real connection
        return;
      }
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      
      onAuthStateChanged(auth, (user) => {
          if(user) {
              Store.setCurrentUser({
                  uid: user.uid,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  email: user.email
              });
          } else {
              Store.remove('current_user');
          }
      });
      
    } catch (e) {
      console.error("Firebase init error:", e);
    }
  },

  async loginWithGoogle() {
    if(mockMode) {
        // Mock login
        Store.setCurrentUser({ uid: 'mock_uid', displayName: 'Người dùng Demo', photoURL: '' });
        return true;
    }
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      throw error;
    }
  },

  async logout() {
    if(mockMode) {
        Store.remove('current_user');
        return true;
    }
    try {
      await signOut(auth);
      Store.remove('current_user');
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  },
  
  getDb() {
      return db;
  },
  
  isMockUser() {
      return mockMode;
  }
};
