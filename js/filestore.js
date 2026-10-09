/*
 * AlimenCal – Gemerkte Speicherorte für Backup/Export/Restore/Import.
 *
 * Hält Datei- und Ordner-Handles der File System Access API in IndexedDB
 * vor, damit wiederholtes Speichern an denselben Ort und erneutes Öffnen
 * der zuletzt verwendeten Datei ohne erneute Ordnerwahl möglich ist.
 *
 * Speicherort-Handles (FileSystemDirectoryHandle / FileSystemFileHandle)
 * verlangen nach einem Browser-Neustart erneut eine Berechtigung; das
 * Nachfragen erfolgt in der UI-Schicht innerhalb eines Klicks.
 *
 * DOM-frei gehalten für Unit-Tests in Node.js (indexedDB dort als
 * globale Test-Stub injizierbar).
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};
AlimenCal.filestore = (function () {
  'use strict';

  var DB_NAME = 'alimencal-filestore';
  var DB_VERSION = 1;
  var STORE = 'handles';

  /* Reiner Helper: Anzeigename eines Handles (Ordner- oder Dateiname),
   * null wenn unbrauchbar. */
  function locationName(handle) {
    if (!handle || typeof handle !== 'object') { return null; }
    var name = handle.name;
    return typeof name === 'string' && name ? name : null;
  }

  /* Reiner Helper: Berechtigung eines Handles abfragen; Rueckgabe ist
   * ein Promise auf 'granted'|'denied'|'prompt' (oder Reject bei
   * fehlender API am Handle). */
  function permissionState(handle, mode) {
    if (!handle || typeof handle.queryPermission !== 'function') {
      return Promise.reject(new Error('no-permission-api'));
    }
    try {
      return Promise.resolve(handle.queryPermission({ mode: mode || 'readwrite' }));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /* Reiner Helper: Berechtigung nachfragen (benoetigt Nutzer-Aktivierung,
   * daher aus einem Klick-Handler heraus aufzurufen). */
  function requestPermission(handle, mode) {
    if (!handle || typeof handle.requestPermission !== 'function') {
      return Promise.reject(new Error('no-permission-api'));
    }
    try {
      return Promise.resolve(handle.requestPermission({ mode: mode || 'readwrite' }));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function indexedDBAvailable() {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  }

  function openDb() {
    if (!indexedDBAvailable()) {
      return Promise.reject(new Error('indexedDB-unavailable'));
    }
    return new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('indexedDB-open-failed')); };
    });
  }

  function withStore(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        var out = fn(store);
        tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        tx.onerror = function () { reject(tx.error || new Error('indexedDB-tx-failed')); };
        tx.onabort = function () { reject(tx.error || new Error('indexedDB-tx-aborted')); };
      });
    });
  }

  /* Handle unter key merken (ueberschreibt einen bisherigen). */
  function put(key, handle) {
    if (!handle) { return Promise.reject(new Error('no-handle')); }
    return withStore('readwrite', function (store) { store.put(handle, key); });
  }

  /* Gemerkten Handle lesen (Promise auf Handle oder null). */
  function get(key) {
    return withStore('readonly', function (store) { return store.get(key); })
      .then(function (value) { return value === undefined ? null : value; });
  }

  /* Gemerkten Handle loeschen (z. B. «Speicherort vergessen»). */
  function remove(key) {
    return withStore('readwrite', function (store) { store.delete(key); });
  }

  return {
    STORE: STORE,
    DB_NAME: DB_NAME,
    locationName: locationName,
    permissionState: permissionState,
    requestPermission: requestPermission,
    indexedDBAvailable: indexedDBAvailable,
    openDb: openDb,
    put: put,
    get: get,
    remove: remove
  };
})();
if (typeof module === 'object' && module.exports) { module.exports = AlimenCal.filestore; }
