import { createHistoryStore } from '../history/store.js';
import { $ } from '../ui/dom.js';
import { createExportDialog } from '../ui/exportDialog.js';
import { createHistoryPanel } from '../ui/historyPanel.js';

export function setupHistory() {
  const store = createHistoryStore();

  createHistoryPanel({
    store,
    drawer: $('history-drawer'),
    backdrop: $('history-backdrop'),
    list: $('history-list'),
    count: $('history-count'),
    openBtn: $('open-history'),
    closeBtn: $('close-history'),
    badge: $('history-badge'),
  });

  createExportDialog({
    store,
    openBtn: $('open-export'),
    dialog: $('export-dialog'),
    backdrop: $('export-backdrop'),
    list: $('export-list'),
    countEl: $('export-count'),
    allBox: $('export-all'),
    goBtn: $('export-go'),
    cancelBtn: $('export-cancel'),
    closeBtn: $('close-export'),
    statusEl: $('export-status'),
  });

  return store;
}

export function saveFinishedRuns(controller, historyStore, visualsStore) {
  let previousStatus = controller.getSnapshot().status;
  controller.subscribe((snap) => {
    const justEnded = previousStatus === 'running' && (snap.status === 'finished' || snap.status === 'collided');
    if (justEnded) historyStore.add(snap, new Date(), visualsStore.get());
    previousStatus = snap.status;
  });
}
