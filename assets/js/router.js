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
    const container = document.getElementById('view-container');
    const startTime = Date.now();
    
    try {
      // 1. Show a less destructive loader (or keep previous if fast)
      // For mobile, we'll use the full loader but with a timeout fallback
      container.innerHTML = `
        <div class="loading-full">
            <i class="fa-solid fa-spinner fa-spin text-primary"></i>
            <span>Đang tải nội dung...</span>
        </div>`;
      
      this.currentRoute = route;
      
      // 2. Load module and assets
      const module = await import(route.modulePath + '?t=' + Date.now()); // cache busting for mobile
      this.currentModule = module;

      // 3. Setup core view structure
      container.innerHTML = module.template;
      document.getElementById('page-title').textContent = module.title || 'Ứng dụng';
      
      // 4. Update Navigation UI
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const cleanHash = window.location.hash.split('/')[1]; 
      const navItem = document.querySelector(`.nav-item[href*="${cleanHash}"]`);
      if(navItem) navItem.classList.add('active');

      // 5. Initialize Page (Crucial: Await this!)
      if (module.init) {
          await module.init(params);
      }

      console.log(`Page ${route.modulePath} loaded in ${Date.now() - startTime}ms`);
      
    } catch (e) {
      console.error("Router Error:", e);
      container.innerHTML = `
        <div class="empty-state">
           <i class="fa-solid fa-circle-exclamation text-danger fa-3x mb-3"></i>
           <h3>Không thể tải trang</h3>
           <p class="text-gray mb-4">${e.message || 'Lỗi kết nối mạng hoặc dữ liệu.'}</p>
           <div class="flex gap-2">
                <button class="btn btn-primary" onclick="window.location.reload()"><i class="fa-solid fa-rotate"></i> Thử lại ngay</button>
                <a href="#/dashboard" class="btn btn-secondary">Về Trang chủ</a>
           </div>
        </div>
      `;
    }
  }
};
