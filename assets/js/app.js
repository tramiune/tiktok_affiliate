import { Router } from './router.js';
import { Store } from '../../services/store.js';
import { FirebaseService } from '../../services/firebase.js';
import { UI } from './ui.js';

window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errStr = `Lỗi hệ thống: ${msg} tại dòng ${lineNo}`;
    console.error(errStr, error);
    try { UI.showError(errStr); } catch(e) { alert(errStr); }
    return false;
};
window.addEventListener('unhandledrejection', function(event) {
    const errStr = `Lỗi ngầm (Promise): ${event.reason}`;
    console.error(errStr);
    try { UI.showError(errStr); } catch(e) { alert(errStr); }
});

document.addEventListener('DOMContentLoaded', () => {
    FirebaseService.init();

    // Mock user for UI dev if desired, uncomment to test without Firebase:
    // Store.setCurrentUser({ uid: 'mock123', displayName: 'Dev User', photoURL: 'https://ui-avatars.com/api/?name=Dev' });

    // Sidebar toggles
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('main-header');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');

    if(btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    if(btnClose && sidebar) {
        btnClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Check user state to display sidebar
    const user = Store.getCurrentUser();
    if(user) {
        if(sidebar) sidebar.classList.remove('hidden');
        if(header) header.classList.remove('hidden');
        
        // Show User UI
        const userInfo = document.getElementById('user-info');
        if(userInfo) {
            userInfo.classList.remove('hidden');
            const userName = document.getElementById('user-name');
            if(userName) userName.textContent = user.displayName || 'Người dùng';
            const userAvatar = document.getElementById('user-avatar');
            if(userAvatar) {
                if(user.photoURL) userAvatar.src = user.photoURL;
                else userAvatar.src = 'https://ui-avatars.com/api/?name=' + (user.displayName || 'U');
            }
        }
    }

    // Auth listeners (will link to real Firebase later)
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            Store.remove('current_user');
            window.location.hash = '#/login';
            window.location.reload();
        });
    }

    // Init router
    window.addEventListener('hashchange', () => Router.navigate());
    Router.navigate();

    // Version Control
    const versionEl = document.getElementById('app-version');
    if(versionEl) {
        const buildDate = new Date().toLocaleString('vi-VN', { hour12: false });
        versionEl.textContent = `Version 1.3.0 • ${buildDate}`;
    }
});
