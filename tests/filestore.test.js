'use strict';
/*
 * Unit-Tests fuer das Filestore-Modul (gemerkte Speicherorte).
 * Ausfuehrung: node tests/filestore.test.js
 */
var fs = require('../js/filestore.js');
var assert = require('assert');
var passed = 0;

function ok(name, cond) {
  if (!cond) {
    console.error('FAIL: ' + name);
    process.exitCode = 1;
  } else {
    passed++;
    console.log('ok  ' + name);
  }
}

/* Minimaler indexedDB-Stub mit derselben IDB-Api-Oberflaeche, die
 * filestore benutzt (open mit version, objectStore put/get/delete). */
function makeIdbStub() {
  function StubDb() {
    this.data = {};
    this.objectStoreNames = { contains: function (n) { return n === 'handles'; } };
  }
  StubDb.prototype.createObjectStore = function () {};
  var db = new StubDb();
  var store = {
    put: function (v, k) { db.data[k] = v; },
    get: function (k) { return db.data[k]; },
    delete: function (k) { delete db.data[k]; }
  };
  var openReq = {
    onupgradeneeded: null, onsuccess: null, onerror: null,
    result: {
      transaction: function () {
        return {
          objectStore: function () { return store; },
          oncomplete: null, onerror: null, onabort: null
        };
      }
    }
  };
  return {
    indexedDB: {
      open: function () { return openReq; }
    },
    triggerOpen: function () { if (openReq.onsuccess) { openReq.onsuccess(); } },
    triggerTx: function () {
      var tx = openReq.result.transaction();
      if (tx.oncomplete) { tx.oncomplete(); }
    },
    data: db.data
  };
}

/* locationName */
ok('locationName: Handle mit Name', fs.locationName({ name: 'Backups' }) === 'Backups');
ok('locationName: leerer Name -> null', fs.locationName({ name: '' }) === null);
ok('locationName: kein Name -> null', fs.locationName({}) === null);
ok('locationName: null -> null', fs.locationName(null) === null);

/* permissionState / requestPermission */
ok('permissionState: ohne API -> reject', fs.permissionState({}).then(function () {
  ok('permissionState: ohne API -> reject (aufruf)', false);
}, function () {
  ok('permissionState: ohne API -> reject (aufruf)', true);
}) instanceof Promise);
ok('permissionState: API vorhanden -> resolved', fs.permissionState({
  queryPermission: function () { return 'granted'; }
}).then(function (v) {
  ok('permissionState: granted weitergegeben', v === 'granted');
}) instanceof Promise);
fs.requestPermission(null).then(function () {
  ok('requestPermission: ohne API -> reject', false);
}, function () {
  ok('requestPermission: ohne API -> reject', true);
});
ok('requestPermission: Rueckgabe ist Promise bei API', fs.requestPermission({
  requestPermission: function () { return 'granted'; }
}).then(function (v) {
  ok('requestPermission: granted weitergegeben', v === 'granted');
}) instanceof Promise);

/* indexedDB nicht verfuegbar */
ok('indexedDBAvailable: ohne globale indexedDB -> false', fs.indexedDBAvailable() === false);
ok('openDb ohne indexedDB -> reject', fs.openDb().then(function () {
  ok('openDb ohne indexedDB -> reject (aufruf)', false);
}, function () {
  ok('openDb ohne indexedDB -> reject (aufruf)', true);
}) instanceof Promise);
ok('put ohne handle -> reject', fs.put('k', null).then(function () {
  ok('put ohne handle -> reject (aufruf)', false);
}, function () {
  ok('put ohne handle -> reject (aufruf)', true);
}) instanceof Promise);

/* Mit Stub: put/get/remove Roundtrip */
(function () {
  var stub = makeIdbStub();
  global.indexedDB = stub.indexedDB;
  ok('indexedDBAvailable: mit Stub -> true', fs.indexedDBAvailable() === true);
  var handle = { name: 'Backups', kind: 'directory' };
  var p = fs.put('backup-dir', handle).then(function () {
    return fs.get('backup-dir');
  }).then(function (got) {
    ok('Roundtrip: Handle zurueckgelesen', got === handle);
    ok('Roundtrip: Name erhalten', fs.locationName(got) === 'Backups');
    return fs.remove('backup-dir');
  }).then(function () {
    return fs.get('backup-dir');
  }).then(function (gone) {
    ok('remove: Handle geloescht', gone === null);
    ok('get: unbekannter Key -> null', true);
  });
  ok('put/get/remove liefern Promises', p instanceof Promise);
  stub.triggerOpen();
  stub.triggerTx();
  delete global.indexedDB;
})();

setTimeout(function () {
  console.log('\n' + passed + ' Tests bestanden' +
    (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
}, 50);
