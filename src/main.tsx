/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import './index.css';
import { sampleSubmissions } from './leetcode_sample';
import allSubmissionsJson from './leetcode_all_submissions.json';

// Type definitions for standard and processed submissions
interface Submission {
  title: string;
  titleSlug: string;
  timestamp: string | number;
  statusDisplay: string;
  lang: string;
}

interface ProblemTracker {
  title: string;
  titleSlug: string;
  cppSolvedDate: string;
  cppTimestamp: number;
  javaSolvedDate?: string;
  javaTimestamp?: number;
  languages: string[];
  status: 'remaining' | 'converted';
}

interface UniqueQuestion {
  title: string;
  titleSlug: string;
  latestTimestamp: number;
  submissionCount: number;
  languages: string[];
  originalLanguages: string[];
  isHighPriorityTask: boolean;
  hasJava: boolean;
  hasCpp: boolean;
  submissions: Submission[];
}

// Global Application State Models
let submissions: Submission[] = [];
let activeLangFilters: Set<string> = new Set<string>();
let activeStatusFilter: string = 'all';
let searchQuery: string = '';
let viewMode: 'all_questions' | 'migration' = 'all_questions';
let currentPage: number = 1;
let pageSize: number = 25;
let activeUsername: string = 'vivek_pawar-3010';
let activeEmail: string = 'vivek_pawar-3010@gmail.com';
let activeMigrationTab: 'remaining' | 'converted' | 'daily' = 'remaining';
let extractedLeetCodeSession: string = '';
let isTasksOnlyFilter: boolean = false;

// On DOM Loaded, mount state elements and setup action behaviors
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Real-Time Clock
  startSystemClock();

  // Try loading full submissions databases
  loadSubmissionsDatabase();

  // Load the visual sync node script strings
  initScriptCodeViews();

  // Binds event listeners to options and control nodes
  setupDashboardControls();
  
  // Initial draw cycle
  updateDashboardViews();
});

/**
 * Updates ticking UTC/system timeline.
 */
function updateCoverageBadge(): void {
  const coverageDateBadge = document.getElementById('coverage-date-badge');
  if (!coverageDateBadge) return;

  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  const javaTimestamps = submissions
    .filter((sub) => normalizeLanguage(sub.lang) === 'java')
    .map((sub) => typeof sub.timestamp === 'string' ? parseInt(sub.timestamp, 10) : sub.timestamp)
    .filter((timestamp) => typeof timestamp === 'number' && !isNaN(timestamp));

  const lastConversionDate = javaTimestamps.length > 0 ? formatDate(Math.max(...javaTimestamps)) : 'N/A';
  coverageDateBadge.textContent = `Today: ${todayDate} | Last Conversion: ${lastConversionDate}`;
}

function startSystemClock(): void {
  const clockEl = document.getElementById('utc-clock');
  if (clockEl) {
    const updateTime = () => {
      const now = new Date();
      const utcStr = now.toISOString().replace('T', ' ').substring(0, 19);
      clockEl.textContent = `System Time (UTC): ${utcStr}`;
      updateCoverageBadge();
    };
    updateTime();
    setInterval(updateTime, 1000);
  }
}

/**
 * Automatically loads the user-provided or fallback submissions schema.
 */
function loadSubmissionsDatabase(): void {
  try {
    // Check if there is cache stored in localStorage (user solved a C++ problem in Java also!)
    const cached = localStorage.getItem('leetcode_custom_submissions');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          submissions = parsed;
          console.log(`Loaded ${submissions.length} submissions from local storage cache!`);
          return;
        }
      } catch (e) {
        console.error("Local storage parsing failed:", e);
      }
    }

    // Check if the user's high-volume leetcode_all_submissions.json is loaded successfully
    if (allSubmissionsJson && Array.isArray(allSubmissionsJson) && allSubmissionsJson.length > 0) {
      submissions = allSubmissionsJson as Submission[];
      console.log(`Successfully compiled ${submissions.length} submissions from local database file!`);
    } else if (sampleSubmissions && sampleSubmissions.length > 0) {
      submissions = sampleSubmissions as Submission[];
      console.warn(`Local json is blank. Fallback to default index template with ${submissions.length} submissions.`);
    }
  } catch (err) {
    console.error('Error compiling default JSON: ', err);
    submissions = sampleSubmissions as Submission[];
  }
}

/**
 * Renders static configurations code blocks inside interactive pre codes.
 */
function initScriptCodeViews(): void {
  const syncScriptPre = document.getElementById('sync-script-pre-code');
  if (syncScriptPre) {
    syncScriptPre.textContent = generateSyncScriptString();
  }
}

/**
 * Escapes dirty strings.
 */
function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normalized name aliases.
 */
function normalizeLanguage(lang: string): string {
  if (!lang) return '';
  const l = lang.toLowerCase().trim();
  if (l === 'cpp' || l === 'c++' || l === 'g++' || l === 'cc') return 'cpp';
  if (l === 'java') return 'java';
  if (l === 'python' || l === 'python3' || l === 'py') return 'python3';
  if (l === 'mysql' || l === 'sql') return 'mysql';
  return l;
}

/**
 * Safe parser for timestamp fields.
 */
function formatDate(timestamp: string | number): string {
  try {
    const rawVal = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    if (isNaN(rawVal) || rawVal === 0) return 'N/A';
    
    // LeetCode timestamps are typically seconds. Check if Milliseconds based
    const ms = rawVal > 9999999999 ? rawVal : rawVal * 1000;
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Event-bindings on interactive GUI controllers
 */
function setupDashboardControls(): void {
  // Username customizer trigger
  const userTrigger = document.getElementById('switch-id-trigger');
  if (userTrigger) {
    userTrigger.addEventListener('click', () => {
      const newName = window.prompt('Enter your LeetCode Account ID / Custom Name:', activeUsername);
      if (newName && newName.trim() !== '') {
        activeUsername = newName.trim();
        const displayID = document.getElementById('profile-id-display');
        if (displayID) displayID.textContent = activeUsername;
        
        // Update mock email too
        activeEmail = `${activeUsername.toLowerCase()}@gmail.com`;
        const displayEmail = document.getElementById('profile-email-display');
        if (displayEmail) displayEmail.textContent = activeEmail;
        
        // Re-compile script code previews with new username
        initScriptCodeViews();
        updateDashboardViews();
      }
    });
  }

  // Live text search binding
  const searchInput = document.getElementById('submissions-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      currentPage = 1;
      updateDashboardViews();
    });
  }

  // Selectors for switching active views mode
  const btnModeAll = document.getElementById('view-mode-all');
  const btnModeMigration = document.getElementById('view-mode-migration');
  
  if (btnModeAll && btnModeMigration) {
    btnModeAll.addEventListener('click', () => {
      viewMode = 'all_questions';
      btnModeAll.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider';
      btnModeMigration.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider';
      
      document.getElementById('pane-all-explorer')?.classList.remove('hidden');
      document.getElementById('pane-migration-suite')?.classList.add('hidden');
      updateDashboardViews();
    });

    btnModeMigration.addEventListener('click', () => {
      viewMode = 'migration';
      btnModeMigration.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider';
      btnModeAll.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider';
      
      document.getElementById('pane-migration-suite')?.classList.remove('hidden');
      document.getElementById('pane-all-explorer')?.classList.add('hidden');
      updateDashboardViews();
    });
  }

  // Pagination controls triggers
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updateDashboardViews();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const maxPages = Math.ceil(getFilteredSubmissions().length / pageSize);
      if (currentPage < maxPages) {
        currentPage++;
        updateDashboardViews();
      }
    });
  }

  // Row Density limit selector
  const pageSizeSelect = document.getElementById('pagination-page-size-selector') as HTMLSelectElement;
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      pageSize = parseInt((e.target as HTMLSelectElement).value, 15);
      currentPage = 1;
      updateDashboardViews();
    });
  }

  // Export current list configuration as CSV
  const csvExportBtn = document.getElementById('export-filtered-csv');
  if (csvExportBtn) {
    csvExportBtn.addEventListener('click', exportFilteredToCSV);
  }

  // Toggle sync drawers
  const configTriggerBtn = document.getElementById('manually-trigger-scrapers');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const drawer = document.getElementById('drawer-configuration');
  
  if (configTriggerBtn && drawer) {
    configTriggerBtn.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
      drawer.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.add('hidden');
    });
  }

  // Mode 1 and 2 switcher inside Drawer Setup
  const drawerTabs = drawer?.querySelectorAll('[id^="config-tab-"]');
  const drawerPanels = drawer?.querySelectorAll('[id^="config-panel-"]');
  if (drawerTabs && drawerPanels) {
    drawerTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const isPublic = tab.id.includes('public');
        
        // Toggle tab highlights
        drawerTabs.forEach((t) => {
          if (t.id === tab.id) {
            t.className = 'pb-2 border-b-2 border-indigo-500 text-indigo-400 font-semibold flex items-center gap-1.5 cursor-pointer transition-all';
          } else {
            t.className = 'pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-all';
          }
        });

        // Toggle panel display
        drawerPanels.forEach((panel) => {
          if (panel.id.includes(isPublic ? 'public' : 'local')) {
            panel.classList.remove('hidden');
          } else {
            panel.classList.add('hidden');
          }
        });
      });
    });
  }

  // Public Poll fetching API triggers
  const fetchBtn = document.getElementById('fetch-btn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', triggerFetchPublicAPI);
  }

  // Restore fallback sample button
  const loadSampleBtn = document.getElementById('load-sample-btn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      submissions = sampleSubmissions as Submission[];
      currentPage = 1;
      updateDashboardViews();
      drawer?.classList.add('hidden');
      alert('Sample Submissions successfully loaded!');
    });
  }

  // Upload parser dropzone handlers
  setupDragAndDropLoader();

  // Helper cookie block textbox live parser
  const cookieTextarea = document.getElementById('raw-helper-input') as HTMLTextAreaElement;
  if (cookieTextarea) {
    cookieTextarea.addEventListener('input', (e) => {
      const val = (e.target as HTMLTextAreaElement).value;
      const match = val.match(/LEETCODE_SESSION=([a-zA-Z0-0\-_~.+%=]+)/) || val.match(/[^"';\s]{200,}/);
      const resultBox = document.getElementById('parser-result-box');
      const tokenDisplay = document.getElementById('extracted-cookie-display-masked');
      
      if (match && match[0]) {
        extractedLeetCodeSession = match[1] || match[0];
        if (resultBox) resultBox.classList.remove('hidden');
        if (tokenDisplay) {
          // Mask the middle letters for eye-safety
          const length = extractedLeetCodeSession.length;
          tokenDisplay.textContent = extractedLeetCodeSession.substring(0, 10) + '...' + extractedLeetCodeSession.substring(length - 15);
        }
        initScriptCodeViews();
      } else {
        if (resultBox) resultBox.classList.add('hidden');
      }
    });

    const copyTokenBtn = document.getElementById('copy-extracted-cookie-btn');
    if (copyTokenBtn) {
      copyTokenBtn.addEventListener('click', () => {
        if (extractedLeetCodeSession) {
          navigator.clipboard.writeText(extractedLeetCodeSession);
          copyTokenBtn.textContent = 'Copied!';
          setTimeout(() => { copyTokenBtn.textContent = 'Copy Token'; }, 2000);
        }
      });
    }
  }

  // Sync script copy code triggers
  const copyScriptBtn = document.getElementById('copy-sync-script-btn');
  if (copyScriptBtn) {
    copyScriptBtn.addEventListener('click', () => {
      const pre = document.getElementById('sync-script-pre-code');
      if (pre && pre.textContent) {
        navigator.clipboard.writeText(pre.textContent);
        copyScriptBtn.textContent = '✓ Script Copied!';
        setTimeout(() => { copyScriptBtn.textContent = 'Copy Javascript'; }, 2000);
      }
    });
  }

  // Subtab buttons inside Migration Pane
  const subBtnRem = document.getElementById('migration-tab-btn-remaining');
  const subBtnConv = document.getElementById('migration-tab-btn-converted');
  const subBtnDaily = document.getElementById('migration-tab-btn-daily');
  if (subBtnRem && subBtnConv && subBtnDaily) {
    const setMigrationSubTab = (tab: 'remaining' | 'converted' | 'daily') => {
      activeMigrationTab = tab;
      const tabButtons = [subBtnRem, subBtnConv, subBtnDaily];
      const tabContents = [
        document.getElementById('migration-tab-content-remaining'),
        document.getElementById('migration-tab-content-converted'),
        document.getElementById('migration-tab-content-daily')
      ];

      tabButtons.forEach((btn, index) => {
        const isActive = (index === 0 && tab === 'remaining') || (index === 1 && tab === 'converted') || (index === 2 && tab === 'daily');
        if (isActive) {
          btn.className = 'pb-2 border-b-2 border-indigo-505 text-indigo-400 font-bold flex items-center gap-2 cursor-pointer text-xs md:text-sm transition-all uppercase tracking-wider';
        } else {
          btn.className = 'pb-2 border-b-2 border-transparent text-slate-400 hover:text-white font-bold flex items-center gap-2 cursor-pointer text-xs md:text-sm transition-all uppercase tracking-wider';
        }
      });

      tabContents.forEach((content, index) => {
        const shouldShow = (index === 0 && tab === 'remaining') || (index === 1 && tab === 'converted') || (index === 2 && tab === 'daily');
        if (shouldShow) {
          content?.classList.remove('hidden');
        } else {
          content?.classList.add('hidden');
        }
      });

      updateDashboardViews();
    };

    subBtnRem.addEventListener('click', () => {
      setMigrationSubTab('remaining');
    });

    subBtnConv.addEventListener('click', () => {
      setMigrationSubTab('converted');
    });

    subBtnDaily.addEventListener('click', () => {
      setMigrationSubTab('daily');
    });
  }

  // C++ Only tasks filter toggle button
  const tasksOnlyBtn = document.getElementById('tasks-only-toggle');
  if (tasksOnlyBtn) {
    tasksOnlyBtn.addEventListener('click', () => {
      isTasksOnlyFilter = !isTasksOnlyFilter;
      if (isTasksOnlyFilter) {
        tasksOnlyBtn.className = 'px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10.5px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 uppercase ring-2 ring-amber-500/20';
      } else {
        tasksOnlyBtn.className = 'px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 text-[10.5px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 uppercase';
      }
      currentPage = 1;
      updateDashboardViews();
    });
  }

  // Export updated JSON to host on GitHub button
  const jsonExportBtn = document.getElementById('export-updated-json');
  if (jsonExportBtn) {
    jsonExportBtn.addEventListener('click', exportUpdatedJSON);
  }

  // Delegate click event for marking a problem as Solved in Java
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-action="mark-java"]');
    if (btn) {
      const slug = btn.getAttribute('data-slug');
      if (slug) {
        markAsSolvedInJava(slug);
      }
    }
  });
}

/**
 * Helper to group submissions into unique questions.
 */
function groupSubmissionsIntoQuestions(subsList: Submission[]): UniqueQuestion[] {
  const grouped: { [slug: string]: Submission[] } = {};
  subsList.forEach((sub) => {
    const slug = sub.titleSlug || 'unknown-slug';
    if (!grouped[slug]) {
      grouped[slug] = [];
    }
    grouped[slug].push(sub);
  });

  const uniqueQuestions: UniqueQuestion[] = [];

  Object.entries(grouped).forEach(([slug, list]) => {
    // Collect accepted submissions to extract solved languages
    const acceptedSubs = list.filter(s => {
      const status = (s.statusDisplay || '').toLowerCase();
      return status === 'accepted' || status === 'ac';
    });

    const isSolved = acceptedSubs.length > 0;
    const targetListForLangs = isSolved ? acceptedSubs : list;

    const languagesSet = new Set<string>();
    const originalLangsSet = new Set<string>();
    targetListForLangs.forEach(s => {
      const norm = normalizeLanguage(s.lang);
      if (norm) {
        languagesSet.add(norm);
        originalLangsSet.add(s.lang);
      }
    });

    const languages = Array.from(languagesSet);
    const originalLanguages = Array.from(originalLangsSet);

    let latestTs = 0;
    list.forEach(s => {
      const ts = typeof s.timestamp === 'string' ? parseInt(s.timestamp, 10) : (typeof s.timestamp === 'number' ? s.timestamp : 0);
      if (ts > latestTs) {
        latestTs = ts;
      }
    });

    const hasCpp = languages.includes('cpp');
    const hasJava = languages.includes('java');
    
    // Designated as highest priority tasks
    const isHighPriorityTask = hasCpp && !hasJava;

    uniqueQuestions.push({
      title: list[0].title || slug,
      titleSlug: slug,
      latestTimestamp: latestTs,
      submissionCount: list.length,
      languages,
      originalLanguages,
      isHighPriorityTask,
      hasJava,
      hasCpp,
      submissions: list
    });
  });

  // Sort: High priority tasks (C++ only solved) bubble to the top of the general table view
  uniqueQuestions.sort((a, b) => {
    if (a.isHighPriorityTask && !b.isHighPriorityTask) return -1;
    if (!a.isHighPriorityTask && b.isHighPriorityTask) return 1;
    return b.latestTimestamp - a.latestTimestamp;
  });

  return uniqueQuestions;
}

/**
 * Filter and search the grouped set of unique questions.
 */
function getFilteredQuestions(): UniqueQuestion[] {
  const allUnique = groupSubmissionsIntoQuestions(submissions);
  return allUnique.filter((q) => {
    // 1. C++ only Tasks filter toggle
    if (isTasksOnlyFilter) {
      if (!q.isHighPriorityTask) return false;
    }

    // 2. Active Languages Multi-select filter:
    // "if i choose java cpp java and cpp will show if i choose cpp only cpp will show"
    if (activeLangFilters.size > 0) {
      const hasMatchingLang = q.languages.some(lang => activeLangFilters.has(lang));
      if (!hasMatchingLang) return false;
    }

    // 3. Status Filter checking if any submission of this unique question has the selected status
    if (activeStatusFilter !== 'all') {
      const matchCriteria = activeStatusFilter.toLowerCase().trim();
      const hasStatusMatch = q.submissions.some(sub => {
        const s = (sub.statusDisplay || '').toLowerCase().trim();
        if (matchCriteria === 'accepted') {
          return s === 'accepted' || s === 'ac';
        } else if (matchCriteria === 'wrong answer') {
          return s === 'wrong answer' || s === 'wa';
        } else if (matchCriteria === 'compile error') {
          return s === 'compile error';
        } else if (matchCriteria === 'time limit exceeded') {
          return s === 'time limit exceeded' || s === 'tle';
        }
        return s.includes(matchCriteria);
      });
      if (!hasStatusMatch) return false;
    }

    // 4. Case-insensitive Search query on Title or slug URL
    if (searchQuery !== '') {
      const title = q.title.toLowerCase();
      const slug = q.titleSlug.toLowerCase();
      if (!title.includes(searchQuery) && !slug.includes(searchQuery)) return false;
    }

    return true;
  });
}

/**
 * Filter the active submissions array according to standard logic and search properties.
 */
function getFilteredSubmissions(): Submission[] {
  return submissions.filter((sub) => {
    // 1. Multiple active languages filters
    if (activeLangFilters.size > 0) {
      const normModel = normalizeLanguage(sub.lang);
      if (!activeLangFilters.has(normModel)) return false;
    }

    // 2. Status Filter
    if (activeStatusFilter !== 'all') {
      const s = (sub.statusDisplay || '').toLowerCase().trim();
      const matchCriteria = activeStatusFilter.toLowerCase().trim();
      
      if (matchCriteria === 'accepted') {
        if (s !== 'accepted' && s !== 'ac') return false;
      } else if (matchCriteria === 'wrong answer') {
        if (s !== 'wrong answer' && s !== 'wa') return false;
      } else if (matchCriteria === 'compile error') {
        if (s !== 'compile error') return false;
      } else if (matchCriteria === 'time limit exceeded') {
        if (s !== 'time limit exceeded' && s !== 'tle') return false;
      } else {
        if (!s.includes(matchCriteria)) return false;
      }
    }

    // 3. Search Query
    if (searchQuery !== '') {
      const title = (sub.title || '').toLowerCase();
      const slug = (sub.titleSlug || '').toLowerCase();
      if (!title.includes(searchQuery) && !slug.includes(searchQuery)) return false;
    }

    return true;
  });
}

/**
 * Write a new Accepted Java submission to signify the user ported a C++ solution!
 */
function markAsSolvedInJava(titleSlug: string): void {
  const existing = submissions.find(s => s.titleSlug === titleSlug);
  const title = existing ? existing.title : titleSlug;

  const newSub: Submission = {
    title: title,
    titleSlug: titleSlug,
    timestamp: Math.floor(Date.now() / 1000),
    statusDisplay: 'Accepted',
    lang: 'java'
  };

  submissions.unshift(newSub);

  // Synchronize to localStorage for persistent changes
  try {
    localStorage.setItem('leetcode_custom_submissions', JSON.stringify(submissions));
  } catch (err) {
    console.error("Local storage sync error: ", err);
  }

  // Reload statistics and update active views dynamically
  currentPage = 1;
  updateDashboardViews();

  // Highlight action with gorgeous custom toast notification
  showNotification(`Success! Marked "${title}" as solved in JAVA!`);
}

/**
 * Generate a beautifully formatted custom alert popup
 */
function showNotification(msg: string): void {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-50 bg-slate-950 border border-emerald-500/30 text-emerald-300 font-medium px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in duration-300 backdrop-blur-md border px-5 py-3.5';
  toast.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
    <span class="text-xs font-mono text-emerald-450">${msg}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 500ms ease';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/**
 * Export full current submissions array as updated json for user to commit on GitHub.
 */
function exportUpdatedJSON(): void {
  try {
    if (submissions.length === 0) {
      alert("Database is empty. Nothing to export.");
      return;
    }

    const payload = JSON.stringify(submissions, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leetcode_all_submissions.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Downloaded updated JSON! Commit to your GitHub repository to persist.");
  } catch (err) {
    console.error("JSON Export failed: ", err);
    alert("Browser blocked file creation.");
  }
}

/**
 * Central state rendering orchestrator. Re-calculates statistics and list items.
 */
function updateDashboardViews(): void {
  // 1. Calculate and populate top user stats
  calculateAndRenderTopStats();

  // 2. Render filter pills (languages distribution)
  renderLanguageFiltersPills();

  // 3. Render content panes based on chosen view mode
  if (viewMode === 'all_questions') {
    renderAllSubmissionsExplorer();
  } else {
    renderMigrationTrackerView();
  }

  updateCoverageBadge();
}

/**
 * Calculates numbers and renders progress bars on the top dashboard cards.
 */
function calculateAndRenderTopStats(): void {
  const totalCount = submissions.length;
  
  // Find unique titles solved with Accepted display
  const acceptedSubs = submissions.filter(s => {
    const sLow = (s.statusDisplay || '').toLowerCase();
    return sLow === 'accepted' || sLow === 'ac';
  });
  
  const uniqueSlugs = new Set(acceptedSubs.map(s => s.titleSlug));
  const uniqueCount = uniqueSlugs.size;

  // Acceptance rate calculation
  const totalAcceptedCount = submissions.filter(s => {
    const sLow = (s.statusDisplay || '').toLowerCase();
    return sLow === 'accepted' || sLow === 'ac';
  }).length;
  const rate = totalCount > 0 ? ((totalAcceptedCount / totalCount) * 100).toFixed(1) : '0.0';

  // Upstream elements write to DOM
  const displayTotal = document.getElementById('profile-stat-total');
  const displayUnique = document.getElementById('profile-stat-unique');
  const displayRate = document.getElementById('profile-stat-rate');

  if (displayTotal) displayTotal.textContent = String(totalCount);
  if (displayUnique) displayUnique.textContent = String(uniqueCount);
  if (displayRate) displayRate.textContent = `${rate}%`;

  // Draw dominant languages
  const langCounters: { [key: string]: number } = {};
  acceptedSubs.forEach((sub) => {
    const key = normalizeLanguage(sub.lang) || 'others';
    langCounters[key] = (langCounters[key] || 0) + 1;
  });

  const javaSolves = langCounters['java'] || 0;
  const cppSolves = langCounters['cpp'] || 0;
  const pythonSolves = langCounters['python3'] || 0;
  
  const allLanguageSolvedCount = Object.values(langCounters).reduce((accum, val) => accum + val, 0);
  const otherSolves = allLanguageSolvedCount - javaSolves - cppSolves - pythonSolves;

  // Render quick widgets block
  const statsGrid = document.getElementById('lang-statistics-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-emerald-400 uppercase">Java Accepted</span>
        <span class="text-lg font-black text-white mt-1">${javaSolves} <span class="text-xs font-normal text-slate-500">solved</span></span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-amber-500 uppercase">C++ Accepted</span>
        <span class="text-lg font-black text-white mt-1">${cppSolves} <span class="text-xs font-normal text-slate-500">solved</span></span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-indigo-400 uppercase">Python Accepted</span>
        <span class="text-lg font-black text-white mt-1">${pythonSolves} <span class="text-xs font-normal text-slate-500">solved</span></span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-teal-400 uppercase">Other Languages</span>
        <span class="text-lg font-black text-white mt-1">${otherSolves} <span class="text-xs font-normal text-slate-500">solved</span></span>
      </div>
    `;
  }

  // Draw Dominant split horizontal progress segments
  const splitBar = document.getElementById('technology-split-bar');
  if (splitBar && allLanguageSolvedCount > 0) {
    const javaPct = (javaSolves / allLanguageSolvedCount) * 100;
    const cppPct = (cppSolves / allLanguageSolvedCount) * 100;
    const pyPct = (pythonSolves / allLanguageSolvedCount) * 100;
    const otherPct = 100 - javaPct - cppPct - pyPct;

    splitBar.innerHTML = `
      <div class="bg-emerald-500 h-full transition-all duration-300" style="width: ${javaPct}%" title="Java: ${javaPct.toFixed(1)}%"></div>
      <div class="bg-amber-500 h-full transition-all duration-300" style="width: ${cppPct}%" title="C++: ${cppPct.toFixed(1)}%"></div>
      <div class="bg-indigo-500 h-full transition-all duration-300" style="width: ${pyPct}%" title="Python: ${pyPct.toFixed(1)}%"></div>
      <div class="bg-teal-500 h-full transition-all duration-300" style="width: ${otherPct}%" title="Others: ${otherPct.toFixed(1)}%"></div>
    `;
  }
}

/**
 * Dynamically parses matching languages from dataset first and appends filter pills.
 */
function renderLanguageFiltersPills(): void {
  const container = document.getElementById('language-filter-container');
  if (!container) return;

  // Collect unique language values
  const countModels: { [key: string]: number } = {};
  submissions.forEach((sub) => {
    const rawCode = normalizeLanguage(sub.lang);
    if (rawCode) {
      countModels[rawCode] = (countModels[rawCode] || 0) + 1;
    }
  });

  // Sort by count
  const sortedLangs = Object.keys(countModels).sort((a, b) => countModels[b] - countModels[a]);

  // Design HTML elements
  const isAllSelected = activeLangFilters.size === 0;
  let buttonsHTML = `
    <button 
      id="lang-pill-all" 
      class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${isAllSelected 
        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
        : 'bg-slate-900 text-slate-405 border-slate-800 hover:text-white hover:border-slate-700'}"
    >
      All (${submissions.length})
    </button>
  `;

  sortedLangs.forEach((lang) => {
    const isSelected = activeLangFilters.has(lang);
    const count = countModels[lang];
    buttonsHTML += `
      <button 
        id="lang-pill-${lang}"
        class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border uppercase ${isSelected 
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md ring-2 ring-indigo-550/20' 
          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-705'}"
      >
        ${lang} (${count})
      </button>
    `;
  });

  container.innerHTML = buttonsHTML;

  // Add click listeners to newly rendered pills
  const allBtn = document.getElementById('lang-pill-all');
  if (allBtn) {
    allBtn.addEventListener('click', () => {
      activeLangFilters.clear();
      currentPage = 1;
      updateDashboardViews();
    });
  }

  sortedLangs.forEach((lang) => {
    const btn = document.getElementById(`lang-pill-${lang}`);
    if (btn) {
      btn.addEventListener('click', () => {
        if (activeLangFilters.has(lang)) {
          activeLangFilters.delete(lang);
        } else {
          activeLangFilters.add(lang);
        }
        currentPage = 1;
        updateDashboardViews();
      });
    }
  });

  // Hook active highlights into status pills as well to keep them in sync
  const statusContainer = document.getElementById('status-filter-container');
  if (statusContainer) {
    const statusButtons = statusContainer.querySelectorAll('button');
    statusButtons.forEach((btn) => {
      const statusValue = btn.getAttribute('data-status') || 'all';
      if (statusValue === activeStatusFilter) {
        btn.className = 'px-3 py-1.5 bg-indigo-600 border border-indigo-505 rounded-lg text-xs font-bold text-white cursor-pointer transition-all';
      } else {
        btn.className = 'px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750/80 rounded-lg text-xs font-bold text-slate-400 cursor-pointer hover:text-white transition-all';
      }

      // Quick listener hook (only on first init, avoids duplicates)
      if (!btn.hasAttribute('data-hooked')) {
        btn.setAttribute('data-hooked', 'true');
        btn.addEventListener('click', () => {
          activeStatusFilter = statusValue;
          currentPage = 1;
          updateDashboardViews();
        });
      }
    });
  }
}

/**
 * Filter list compiler inside Pane 1 Submissions Hub. Includes proper paginated slices.
 */
function renderAllSubmissionsExplorer(): void {
  const tableBody = document.getElementById('leetcode-sub-table-body');
  const emptyMessage = document.getElementById('table-hub-empty-state');
  
  if (!tableBody) return;

  const filtered = getFilteredQuestions();
  const maxPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Correct index slide overflows
  if (currentPage > maxPages) currentPage = maxPages;

  // Slice results list
  const startIdx = (currentPage - 1) * pageSize;
  const endSlice = Math.min(filtered.length, startIdx + pageSize);
  const paginatedList = filtered.slice(startIdx, endSlice);

  // Update table text labels
  const matchedText = document.getElementById('stats-total-matched-text');
  if (matchedText) {
    matchedText.textContent = `Analyzed ${filtered.length} unique questions across active database filter configuration`;
  }

  const paginationStats = document.getElementById('pagination-stats-details');
  if (paginationStats) {
    paginationStats.textContent = filtered.length > 0 
      ? `Showing rows ${startIdx + 1} to ${endSlice} of ${filtered.length} filtered items`
      : 'Showing 0 rows of 0 filtered items';
  }

  const pageIndicator = document.getElementById('pagination-page-indicator');
  if (pageIndicator) {
    pageIndicator.textContent = `Page ${currentPage} of ${maxPages}`;
  }

  // Update prev / next state
  const prevBtn = document.getElementById('pagination-prev') as HTMLButtonElement;
  const nextBtn = document.getElementById('pagination-next') as HTMLButtonElement;
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === maxPages || filtered.length === 0;

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    emptyMessage?.classList.remove('hidden');
    return;
  }

  emptyMessage?.classList.add('hidden');

  tableBody.innerHTML = paginatedList
    .map((q) => {
      // Create language badges
      const langBadges = q.languages.map((lang) => {
        const langClean = normalizeLanguage(lang);
        let langClass = 'bg-slate-900 border-slate-800 text-indigo-300';
        if (langClean === 'java') {
          langClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (langClean === 'cpp') {
          langClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
        return `
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${langClass}">
            ${lang}
          </span>
        `;
      }).join(' ');

      // Solved only in C++ means high priority porting task
      let taskBadge = '';
      let markJavaButton = '';
      if (q.isHighPriorityTask) {
        taskBadge = `
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider text-amber-500/90 bg-amber-500/10 border border-amber-500/20 uppercase ml-2 animate-pulse" title="This problem is solved in C++ but missing Java, which has highest priority!">
            🔥 port pending
          </span>
        `;
        markJavaButton = `
          <button 
            data-action="mark-java"
            data-slug="${q.titleSlug}"
            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 hover:scale-102"
            title="Mark Solved in Java"
          >
            <span>✓</span> Solved in Java
          </button>
        `;
      }

      return `
        <tr class="hover:bg-slate-900/50 transition-colors border-b border-slate-850">
          <!-- Col 1: Title Slug -->
          <td class="py-3.5 px-4 max-w-xs md:max-w-md">
            <div class="flex items-center flex-wrap gap-1.5">
              <span class="font-bold text-white font-sans text-xs sm:text-sm tracking-tight">${escapeHTML(q.title)}</span>
              ${taskBadge}
            </div>
            <div class="text-[10px] text-slate-500 font-mono mt-0.5">${escapeHTML(q.titleSlug)}</div>
          </td>
          
          <!-- Col 2: Submission Count -->
          <td class="py-3.5 px-4 text-center">
            <span class="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] rounded-full">
              ${q.submissionCount}
            </span>
          </td>
          
          <!-- Col 3: Languages solved -->
          <td class="py-3.5 px-4">
            <div class="flex flex-wrap gap-1">
              ${langBadges}
            </div>
          </td>
          
          <!-- Col 4: Last Date -->
          <td class="py-3.5 px-4 font-mono text-slate-405 text-xs">
            ${formatDate(q.latestTimestamp)}
          </td>
          
          <!-- Col 5: Actions link and solve -->
          <td class="py-3.5 px-4 text-center mr-2">
            <div class="flex items-center justify-center gap-2">
              <a 
                href="https://leetcode.com/problems/${q.titleSlug}/" 
                target="_blank" 
                referrerpolicy="no-referrer"
                class="inline-flex items-center justify-center px-2.5 py-1 bg-slate-900 hover:bg-slate-800 hover:text-indigo-400 border border-slate-800 text-slate-405 text-[10.5px] font-mono rounded-lg transition-all"
              >
                Solve ➔
              </a>
              ${markJavaButton}
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Calculations and logic for compiling comparative C++ to Java Migrations lists.
 */
function renderMigrationTrackerView(): void {
  // Select components inside Pane 2
  const counterRem = document.getElementById('migration-rem-counter');
  const counterConv = document.getElementById('migration-conv-counter');
  const counterTotal = document.getElementById('migration-total-counter');
  const progressLine = document.getElementById('migration-counter-progress-bar');

  const tabCountRem = document.getElementById('migration-tab-count-rem');
  const tabCountConv = document.getElementById('migration-tab-count-conv');

  // Filter corresponding to "Accepted" solutions
  const accepted = submissions.filter(s => {
    const sLow = (s.statusDisplay || '').toLowerCase().trim();
    return sLow === 'accepted' || sLow === 'ac';
  });

  // Group by titleSlug
  const problems: { [slug: string] : { title: string, titleSlug: string, subs: Submission[] } } = {};
  accepted.forEach((sub) => {
    const slug = sub.titleSlug;
    if (!slug) return;
    if (!problems[slug]) {
      problems[slug] = { title: sub.title || 'Untitled Problem', titleSlug: slug, subs: [] };
    }
    problems[slug].subs.push(sub);
  });

  const remainingList: ProblemTracker[] = [];
  const convertedList: ProblemTracker[] = [];

  Object.values(problems).forEach((p) => {
    const uniqueLangs = new Set<string>();
    const cppSubs: Submission[] = [];
    const javaSubs: Submission[] = [];

    p.subs.forEach((sub) => {
      const parsedLang = normalizeLanguage(sub.lang);
      if (parsedLang === 'cpp') {
        cppSubs.push(sub);
        uniqueLangs.add('cpp');
      } else if (parsedLang === 'java') {
        javaSubs.push(sub);
        uniqueLangs.add('java');
      } else {
        if (parsedLang) uniqueLangs.add(parsedLang);
      }
    });

    const hasCpp = cppSubs.length > 0;
    const hasJava = javaSubs.length > 0;

    // Classify
    if (hasCpp && !hasJava) {
      cppSubs.sort((a, b) => parseInt(b.timestamp as string, 10) - parseInt(a.timestamp as string, 10));
      remainingList.push({
        title: p.title,
        titleSlug: p.titleSlug,
        cppSolvedDate: formatDate(cppSubs[0].timestamp),
        cppTimestamp: typeof cppSubs[0].timestamp === 'string' ? parseInt(cppSubs[0].timestamp) : cppSubs[0].timestamp,
        languages: Array.from(uniqueLangs),
        status: 'remaining'
      });
    } else if (hasCpp && hasJava) {
      cppSubs.sort((a, b) => parseInt(b.timestamp as string, 10) - parseInt(a.timestamp as string, 10));
      javaSubs.sort((a, b) => parseInt(b.timestamp as string, 10) - parseInt(a.timestamp as string, 10));
      convertedList.push({
        title: p.title,
        titleSlug: p.titleSlug,
        cppSolvedDate: formatDate(cppSubs[0].timestamp),
        cppTimestamp: typeof cppSubs[0].timestamp === 'string' ? parseInt(cppSubs[0].timestamp) : cppSubs[0].timestamp,
        javaSolvedDate: formatDate(javaSubs[0].timestamp),
        javaTimestamp: typeof javaSubs[0].timestamp === 'string' ? parseInt(javaSubs[0].timestamp) : javaSubs[0].timestamp,
        languages: Array.from(uniqueLangs),
        status: 'converted'
      });
    }
  });

  // Sort lists
  remainingList.sort((a, b) => b.cppSolvedDate.localeCompare(a.cppSolvedDate));
  convertedList.sort((a, b) => (b.javaTimestamp || 0) - (a.javaTimestamp || 0));

  // Write counters
  const remCount = remainingList.length;
  const convCount = convertedList.length;
  const totalCount = remCount + convCount;
  const percentage = totalCount > 0 ? ((convCount / totalCount) * 100).toFixed(1) : '0.0';

  if (counterRem) counterRem.textContent = String(remCount);
  if (counterConv) counterConv.textContent = String(convCount);
  if (counterTotal) counterTotal.textContent = String(totalCount);
  if (progressLine) progressLine.style.width = `${percentage}%`;

  if (tabCountRem) tabCountRem.textContent = String(remCount);
  if (tabCountConv) tabCountConv.textContent = String(convCount);

  // Render Table content: Remaining
  const tableRem = document.getElementById('migration-table-remaining-body');
  const msgRem = document.getElementById('migration-table-remaining-empty');
  if (tableRem) {
    if (remCount === 0) {
      tableRem.innerHTML = '';
      msgRem?.classList.remove('hidden');
    } else {
      msgRem?.classList.add('hidden');
      tableRem.innerHTML = remainingList
        .map((prob) => {
          const langBadges = prob.languages
            .map(l => `<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono border bg-slate-900 text-amber-300 border-amber-800/40 uppercase">${l}</span>`)
            .join(' ');
          
          return `
            <tr class="hover:bg-slate-900/50 transition-colors border-b border-slate-850">
              <td class="py-3 px-4">
                <div class="font-bold text-white text-xs sm:text-sm">${escapeHTML(prob.title)}</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">${escapeHTML(prob.titleSlug)}</div>
              </td>
              <td class="py-3 px-4 font-mono text-slate-400 text-xs">${prob.cppSolvedDate}</td>
              <td class="py-3 px-4"><div class="flex gap-1">${langBadges}</div></td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <a 
                    href="https://leetcode.com/problems/${prob.titleSlug}/" 
                    target="_blank" 
                    referrerpolicy="no-referrer"
                    class="inline-flex items-center px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold transition-all border border-amber-500/20"
                  >
                    Create Java Port ➔
                  </a>
                  <button 
                    data-action="mark-java"
                    data-slug="${prob.titleSlug}"
                    class="inline-flex items-center px-3 py-1 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white rounded-lg text-xs cursor-pointer transition-all gap-1 font-mono uppercase"
                  >
                    ✓ Ported
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  // Render Table content: Converted
  const tableConv = document.getElementById('migration-table-converted-body');
  const msgConv = document.getElementById('migration-table-converted-empty');
  if (tableConv) {
    if (convCount === 0) {
      tableConv.innerHTML = '';
      msgConv?.classList.remove('hidden');
    } else {
      msgConv?.classList.add('hidden');
      tableConv.innerHTML = convertedList
        .map((prob) => {
          let gapBadge = '';
          try {
            const cppTime = prob.cppTimestamp || 0;
            const javaTime = prob.javaTimestamp || 0;
            const diffDays = Math.floor(Math.abs(javaTime - cppTime) / (60 * 60 * 24));
            const colorClass = diffDays === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-400 border-slate-800';
            const detailLabel = diffDays === 0 ? 'Converted Same Day' : `${diffDays} Day Interval`;
            gapBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${colorClass}">${detailLabel}</span>`;
          } catch {
            gapBadge = '';
          }

          return `
            <tr class="hover:bg-slate-900/50 transition-colors border-b border-slate-850">
              <td class="py-3 px-4">
                <div class="font-bold text-white text-xs sm:text-sm">${escapeHTML(prob.title)}</div>
                <div class="text-[10px] text-slate-600 font-mono mt-0.5">${escapeHTML(prob.titleSlug)}</div>
              </td>
              <td class="py-3 px-4 font-mono text-slate-450 text-xs">${prob.cppSolvedDate}</td>
              <td class="py-3 px-4 font-mono text-emerald-400 font-bold text-xs">${prob.javaSolvedDate}</td>
              <td class="py-3 px-4">${gapBadge}</td>
              <td class="py-3 px-4 text-center">
                <a 
                  href="https://leetcode.com/problems/${prob.titleSlug}/" 
                  target="_blank" 
                  referrerpolicy="no-referrer"
                  class="inline-flex px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 text-[11px] rounded transition-all font-mono"
                >
                  view ➔
                </a>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  renderDailyConversionTracker(convertedList);
}

function renderDailyConversionTracker(convertedList: ProblemTracker[]): void {
  const tableBody = document.getElementById('migration-table-daily-body');
  const emptyState = document.getElementById('migration-table-daily-empty');
  const rangeEl = document.getElementById('daily-tracker-range');
  const totalEl = document.getElementById('daily-tracker-total');
  const daysEl = document.getElementById('daily-tracker-days');

  const dailyCounts = new Map<string, number>();
  convertedList.forEach((prob) => {
    const day = prob.javaSolvedDate && prob.javaSolvedDate !== 'N/A' ? prob.javaSolvedDate : formatDate(prob.javaTimestamp || 0);
    if (!day || day === 'N/A') return;
    dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  });

  const sortedDays = Array.from(dailyCounts.keys()).sort((a, b) => b.localeCompare(a));
  const totalConversions = convertedList.length;
  const trackedDays = sortedDays.length;

  if (rangeEl) {
    if (sortedDays.length > 0) {
      rangeEl.textContent = `${sortedDays[0]} → ${sortedDays[sortedDays.length - 1]}`;
    } else {
      rangeEl.textContent = 'No conversions recorded yet';
    }
  }

  if (totalEl) {
    totalEl.textContent = String(totalConversions);
  }

  if (daysEl) {
    daysEl.textContent = String(trackedDays);
  }

  if (!tableBody || !emptyState) return;

  if (sortedDays.length === 0) {
    tableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  let runningTotal = 0;
  tableBody.innerHTML = sortedDays
    .map((day) => {
      const count = dailyCounts.get(day) || 0;
      runningTotal += count;

      return `
        <tr class="hover:bg-slate-900/50 transition-colors border-b border-slate-850">
          <td class="py-3 px-4 font-mono text-cyan-300 text-xs">${escapeHTML(day)}</td>
          <td class="py-3 px-4 font-bold text-emerald-400 text-xs">${count}</td>
          <td class="py-3 px-4 font-mono text-slate-300 text-xs">${runningTotal}</td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Handles exporting filtered submissions as a beautifully formatted CSV dump.
 */
function exportFilteredToCSV(): void {
  try {
    const filtered = getFilteredQuestions();
    if (filtered.length === 0) {
      alert('Your current filter view is completely empty. Please clear search limits to export.');
      return;
    }

    let csvContent = "Title,Title Slug,Submissions Count,Languages Solved,Latest Solve Date,C++ Port Pending\n";
    filtered.forEach((q) => {
      const titleClean = q.title.replace(/"/g, '""');
      const slugClean = q.titleSlug.replace(/"/g, '""');
      const langsClean = q.languages.join('; ');
      const dateClean = formatDate(q.latestTimestamp);
      const pendingClean = q.isHighPriorityTask ? "YES" : "NO";
      csvContent += `"${titleClean}","${slugClean}","${q.submissionCount}","${langsClean}","${dateClean}","${pendingClean}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeUsername}_filtered_questions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('CSV Export failed:', err);
    alert('Failed to construct and export file due to a browser permission block.');
  }
}

/**
 * Orchestrate pulling submissions from public backend proxies.
 */
async function triggerFetchPublicAPI(): Promise<void> {
  const accountInput = document.getElementById('username-input') as HTMLInputElement;
  if (!accountInput) return;

  const rawID = accountInput.value.trim();
  if (!rawID || rawID === 'type_username_here') {
    alert('Please type your actual custom LeetCode Slug inside the scraper panel card!');
    return;
  }

  const anim = document.getElementById('loading-state');
  if (anim) anim.classList.remove('hidden');

  try {
    const responseHost = `https://alfa-leetcode-api.onrender.com/${rawID}/submission?limit=20`;
    const checkObj = await fetch(responseHost);
    
    if (!checkObj.ok) {
      throw new Error(`HTTP Endpoint returned status ${checkObj.status}`);
    }

    const dataObj = await checkObj.json();
    const subList = dataObj.submission || dataObj.submissions || dataObj.submissionList || (Array.isArray(dataObj) ? dataObj : []);

    if (subList.length === 0) {
      throw new Error('Zero submissions captured for this public name slug.');
    }

    submissions = subList.map((e: any) => ({
      title: e.title || '',
      titleSlug: e.titleSlug || '',
      timestamp: e.timestamp || 0,
      statusDisplay: e.statusDisplay || '',
      lang: e.lang || ''
    }));

    currentPage = 1;
    updateDashboardViews();
    
    if (anim) anim.classList.add('hidden');
    
    // Hide drawer automatically
    document.getElementById('drawer-configuration')?.classList.add('hidden');
    alert(`Success! Successfully scraped and loaded ${submissions.length} public solutions.`);
  } catch (err: any) {
    if (anim) anim.classList.add('hidden');
    console.error(err);
    alert(`Failed to scrape public data: ${err.message || 'Server timeout'}. Use the local Cookie Syncer setup instead for offline full backups!`);
  }
}

/**
 * Sync logic: drag & drop loaders with browser reader validation.
 */
function setupDragAndDropLoader(): void {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => { fileInput.click(); });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-600', 'bg-indigo-900/30');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-900/30');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-900/30');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      processImportedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      processImportedFile(fileInput.files[0]);
    }
  });
}

/**
 * Core Parser logic for processing raw imported databases.
 */
function processImportedFile(file: File): void {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const output = e.target?.result as string;
      if (!output) throw new Error('Empty document parsed.');

      const parsed = JSON.parse(output);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed.submissions && Array.isArray(parsed.submissions)) {
        list = parsed.submissions;
      } else if (parsed.submissionList && Array.isArray(parsed.submissionList)) {
        list = parsed.submissionList;
      } else {
        throw new Error('Unsupported JSON file formatting layout.');
      }

      submissions = list.map((elem) => ({
        title: elem.title || elem.title_display || '',
        titleSlug: elem.titleSlug || elem.title_slug || '',
        timestamp: elem.timestamp || elem.submit_time || 0,
        statusDisplay: elem.statusDisplay || elem.status || '',
        lang: elem.lang || elem.language || ''
      }));

      currentPage = 1;
      updateDashboardViews();

      // Show indicator
      const nameBox = document.getElementById('file-name-display');
      const loadedLabel = document.getElementById('loaded-file-name');
      if (nameBox && loadedLabel) {
        loadedLabel.textContent = `Active DB: ${file.name} (${submissions.length} loaded)`;
        nameBox.classList.remove('hidden');
      }

      alert(`Success! Compiled ${submissions.length} loaded submissions from "${file.name}"!`);
    } catch (err: any) {
      alert(`Parsing failed: ${err.message || 'Key errors'}`);
    }
  };
  reader.readAsText(file);
}

/**
 * Static sync scripts template generator.
 */
function generateSyncScriptString(): string {
  const sessionVal = extractedLeetCodeSession || "YOUR_LEETCODE_SESSION_COOKIE_VALUE_HERE";
  return `/**
 * Standalone Local Sync Script to Download ALL of your LeetCode Submissions
 * Save this file as: leetcode_sync_all.js
 * Run in your terminal as: node leetcode_sync_all.js
 */

const fs = require('fs');
const https = require('https');

// ====================================================================
// CONFIGURATION: Paste your real LEETCODE_SESSION cookie value here.
// ====================================================================
const LEETCODE_SESSION = "${sessionVal}";

async function run() {
  if (!LEETCODE_SESSION || LEETCODE_SESSION === "YOUR_LEETCODE_SESSION_COOKIE_VALUE_HERE") {
    console.error("❌ ERROR: Please paste your real 'LEETCODE_SESSION' cookie into the script.");
    console.log("👉 Read the instructions on the web page to learn how to grab this cookie!");
    process.exit(1);
  }

  let offset = 0;
  const limit = 100;
  let allSubmissions = [];
  let hasNext = true;
  let lastKey = null;

  console.log("====================================================");
  console.log("⚡ Starting Full LeetCode GraphQL Submissions Sync Tool");
  console.log("====================================================");

  while (hasNext) {
    console.log(\`📡 Fetching submissions \\\${offset} to \\\${offset + limit} using GraphQL API...\\n\`);
    try {
      const data = await getSubmissionsPage(offset, limit, lastKey);
      if (!data) {
        throw new Error("No data received or invalid response from GraphQL API.");
      }
      
      const subs = data.submissions || [];
      allSubmissions.push(...subs);
      
      console.log(\`   ✓ Loaded \\\${subs.length} items. (Running total: \\\${allSubmissions.length})\`);
      
      hasNext = data.hasNext && subs.length > 0;
      lastKey = data.lastKey || null;
      offset += limit;
      
      // Delay to respect LeetCode's rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error(\`❌ Connection or GraphQL error at offset \\\${offset}: \\\${err.message}\`);
      console.log("Saving collected entries so far...");
      break;
    }
  }

  // Format into standard schema for local importer
  const formatted = allSubmissions.map(sub => ({
    title: sub.title || '',
    titleSlug: sub.titleSlug || '',
    timestamp: typeof sub.timestamp === 'string' ? parseInt(sub.timestamp, 10) : (sub.timestamp || 0),
    statusDisplay: sub.statusDisplay || '',
    lang: sub.lang || ''
  }));

  const filename = 'leetcode_all_submissions.json';
  fs.writeFileSync(filename, JSON.stringify(formatted, null, 2), 'utf-8');

  console.log("\\n====================================================");
  console.log("🎉 PROCESS COMPLETE SUCCESS!");
  console.log(\`💾 Saved \\\${formatted.length} submissions to file: \\\${filename}\`);
  console.log("👉 Drag & Drop this file into the Web UI loader or replace it in the root folder!");
  console.log("====================================================");
}

function getSubmissionsPage(offset, limit, lastKey) {
  return new Promise((resolve, reject) => {
    const query = \`
      query submissionList(\\\$offset: Int!, \\\$limit: Int!, \\\$lastKey: String, \\\$questionSlug: String) {
        submissionList(offset: \\\$offset, limit: \\\$limit, lastKey: \\\$lastKey, questionSlug: \\\$questionSlug) {
          lastKey
          hasNext
          submissions {
            id
            title
            titleSlug
            statusDisplay
            lang
            timestamp
          }
        }
      }
    \`;

    const postData = JSON.stringify({
      operationName: 'submissionList',
      query: query,
      variables: {
        offset: offset,
        limit: limit,
        lastKey: lastKey || null,
        questionSlug: null
      }
    });

    const options = {
      hostname: 'leetcode.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Cookie': \`LEETCODE_SESSION=\\\${LEETCODE_SESSION}\`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/submissions/',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(\`HTTP \\\${res.statusCode}\`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            return reject(new Error(parsed.errors[0].message || 'GraphQL error'));
          }
          if (parsed.data && parsed.data.submissionList) {
            resolve(parsed.data.submissionList);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}
`;
}
