// localStorage can throw (private mode, blocked storage, full quota), so every access is guarded.
// Only small per-device preferences belong here; never tokens.
export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // The preference simply won't persist; the app still works.
    }
  },
};
