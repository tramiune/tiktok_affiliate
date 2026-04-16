/**
 * Very Simple Hash Router
 */

const routes = {
  // Hash Map -> { modulePath: '', authRequired: boolean }
  '#/login': { modulePath: '../../pages/login.js', authRequired: false },
  '#/dashboard': { modulePath: '../../pages/dashboard.js', authRequired: true },
  '#/channel/create': { modulePath: '../../pages/channel-create.js', authRequired: true },
  '#/channel': { modulePath: '../../pages/strategy.js', authRequired: true },
  '#/settings': { modulePath: '../../pages/settings.js', authRequired: true },
  '#/strategy': { modulePath: '../../pages/strategy.js', authRequired: true },
  '#/character-bible': { modulePath: '../../pages/character-bible.js', authRequired: true },
  '#/video-detail': { modulePath: '../../pages/video-detail.js', authRequired: true },
  '#/scene-detail': { modulePath: '../../pages/scene-detail.js', authRequired: true }
};

export const Router = {
  currentRoute: null,
  currentModule: null,

  navigate: async function() {
    let hash = window.location.hash || '#/dashboard';
    
    // Xử lý các hash có ID (vd: #/video-detail/channelId/videoId)
    let basePath = hash;
    let params = {};
    
    const parts = hash.split('/');
    if (parts.length > 2) {
        basePath = parts[0] + '/' + parts[1]; // ví dụ #/channel, #/video-detail, ...
        
        if (basePath === '#/channel' || basePath === '#/character-bible') {
            params.channelId = parts[2];
        } else if (basePath === '#/video-detail') {
            params.channelId = parts[2];
            params.videoId = parts[3];
        } else if (basePath === '#/scene-detail') {
            params.channelId = parts[2];
            params.videoId = parts[3];
            params.sceneId = parts[4];
        }
    }

    // Ngoại lệ cho trang create
    if (hash === '#/channel/create') {
        basePath = '#/channel/create';
        params = {};
    }

    // Default route
    if (!routes[basePath]) {
        if (hash === '#/') hash = '#/dashboard';
        basePath = hash;
    }
    
    const route = routes[basePath] || routes['#/dashboard'];

    // Check Auth - Tạm thời bỏ qua nếu mock auth. Sẽ cắm logic check Auth Firebase sau.
    import('../../services/store.js').then(({ Store }) => {
       const user = Store.getCurrentUser();
       if (route.authRequired && !user) {
           window.location.hash = '#/login';
           return;
       }
       if (basePath === '#/login' && user) {
           window.location.hash = '#/dashboard';
           return;
       }
       
       this.loadView(route, params);
    });
  },

  loadView: async function(route, params) {
    try {
      // Show loader
      const container = document.getElementById('view-container');
      container.innerHTML = '<div class="loading-full"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải trang...</div>';
      
      this.currentRoute = route;
      
      // Load module dynamically
      const module = await import(route.modulePath);
      this.currentModule = module;

      // Update active nav
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      let hashStr = window.location.hash.split('?')[0]; // bỏ params nếu có
      let navItem = document.querySelector(`.nav-item[href="${hashStr}"]`);
      if(navItem) navItem.classList.add('active');

      // Setup view
      container.innerHTML = module.template;
      document.getElementById('page-title').textContent = module.title || 'Ứng dụng';
      
      if (module.init) {
          module.init(params);
      }
    } catch (e) {
      console.error(e);
      document.getElementById('view-container').innerHTML = `
        <div class="empty-state">
           <i class="fa-solid fa-triangle-exclamation text-danger"></i>
           <h3>Lỗi tải trang</h3>
           <p>${e.message}</p>
        </div>
      `;
    }
  }
};
