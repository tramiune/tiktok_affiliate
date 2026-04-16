import { Router } from './router.js';
import { Store } from '../../services/store.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Mock user for UI dev if desired, uncomment to test without Firebase:
    // Store.setCurrentUser({ uid: 'mock123', displayName: 'Dev User', photoURL: 'https://ui-avatars.com/api/?name=Dev' });

    // Sidebar toggles
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('main-header');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');

    btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    btnClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    // Check user state to display sidebar
    const user = Store.getCurrentUser();
    if(user) {
        sidebar.classList.remove('hidden');
        header.classList.remove('hidden');
        
        // Show User UI
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-name').textContent = user.displayName || 'Người dùng';
        if(user.photoURL) document.getElementById('user-avatar').src = user.photoURL;
        else document.getElementById('user-avatar').src = 'https://ui-avatars.com/api/?name=' + (user.displayName || 'U');
    }

    // Auth listeners (will link to real Firebase later)
    document.getElementById('btn-logout').addEventListener('click', () => {
        // Mock logout
        Store.remove('current_user');
        window.location.hash = '#/login';
        window.location.reload();
    });

    // Init router
    window.addEventListener('hashchange', () => Router.navigate());
    Router.navigate();
});
