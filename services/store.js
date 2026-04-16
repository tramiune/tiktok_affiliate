/**
 * Store System (Local Storage Wrapper)
 * Dùng để quản lý các settings cá nhân (như OpenAI Key) an toàn tại client side
 */

const PREFIX = 'tiktok_ai_planner_';

export const Store = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading ${key} from store`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to store`, e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /** 
   * Quản lý OpenAI API Key 
   * API Key được ưu tiên lưu ở LocalStorage để bảo mật
   */
  getOpenAIKey() {
    return this.get('openai_key', '');
  },

  setOpenAIKey(key) {
    return this.set('openai_key', key);
  },

  /**
   * Mock Current User ID for testing before Firebase is setup
   */
  setCurrentUser(user) {
    this.set('current_user', user);
  },
  
  getCurrentUser() {
    return this.get('current_user', null);
  },

  /**
   * Quản lý Link Video Generator (Veo, Kling, Luma...)
   */
  getGeneratorUrl() {
    return this.get('generator_url', 'https://videofx.google.com/');
  },

  setGeneratorUrl(url) {
    return this.set('generator_url', url);
  }
};
