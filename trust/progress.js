/**
 * Part107Progress — shared knowledge-check / quiz progress tracker.
 *
 * Stores one small record per tracked item (a lesson's knowledge check,
 * a lesson's separate quiz file, the weather challenge, a practice test,
 * etc.) in localStorage, keyed by a unique item id you choose, e.g.
 * "Lesson-1-Regulations-test" or "wx-challenge". Because it's localStorage,
 * any page served from the same origin (e.g. the same hosted site) can read
 * and write the same data — that's what lets the lesson page update the
 * status shown back on the Mission Hub (index) page.
 *
 * NOTE: if these files are opened directly as local file:// pages rather
 * than through a web server, some browsers isolate localStorage per file
 * and progress won't carry over between pages. Serving the folder from any
 * static host (GitHub Pages, Netlify, a local `python -m http.server`,
 * etc.) avoids that.
 *
 * Usage on a lesson/quiz page, once the check is graded:
 *   Part107Progress.recordResult('Lesson-1-Regulations-test', {
 *     score: 9, total: 12, passThreshold: 0.7 // 0.7 = 70%, the default
 *   });
 *
 * Usage on the Mission Hub page to read everything back:
 *   const data = Part107Progress.getAll();
 *   // data['Lesson-1-Regulations-test'] -> { status: 'passed', score, total, pct, updatedAt }
 *
 * Reset a single item, or everything:
 *   Part107Progress.reset('Lesson-1-Regulations-test');
 *   Part107Progress.resetAll();
 *
 * React to changes made in another tab/page without a reload:
 *   Part107Progress.onChange(() => { ...re-render... });
 */
(function (global) {
  const STORAGE_KEY = 'part107_progress_v1';
  const EVENT_NAME = 'part107-progress-changed';

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable (private mode, quota, etc.) — fail silently */
    }
    try {
      document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));
    } catch (e) {
      /* no-op */
    }
  }

  /**
   * Record the outcome of a knowledge check / quiz / test run.
   * @param {string} itemId - unique id for this check, e.g. "Lesson-1-Regulations-test"
   * @param {{score:number, total:number, passThreshold?:number}} result
   * @returns the stored record
   */
  function recordResult(itemId, result) {
    if (!itemId || !result) return null;
    const total = Number(result.total) || 0;
    const score = Number(result.score) || 0;
    const threshold = (result.passThreshold != null) ? result.passThreshold : 0.7;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = total > 0 && (score / total) >= threshold;

    const data = readAll();
    data[itemId] = {
      status: passed ? 'passed' : 'failed',
      score: score,
      total: total,
      pct: pct,
      updatedAt: new Date().toISOString()
    };
    writeAll(data);
    return data[itemId];
  }

  function getItem(itemId) {
    const data = readAll();
    return data[itemId] || null;
  }

  function getAll() {
    return readAll();
  }

  /** Clear one item's saved result (falls back to "not attempted"). */
  function reset(itemId) {
    const data = readAll();
    delete data[itemId];
    writeAll(data);
  }

  /** Clear every saved result on the site. */
  function resetAll() {
    writeAll({});
  }

  /** Fire cb whenever progress changes — same tab (custom event) or another tab (storage event). */
  function onChange(cb) {
    document.addEventListener(EVENT_NAME, cb);
    global.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) cb();
    });
  }

  global.Part107Progress = {
    recordResult: recordResult,
    getItem: getItem,
    getAll: getAll,
    reset: reset,
    resetAll: resetAll,
    onChange: onChange,
    STORAGE_KEY: STORAGE_KEY
  };
})(window);
