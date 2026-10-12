// A fresh owner for a screen test: deletes the fake IndexedDB database and waits until it is
// gone. An earlier test's app may still hold a connection, so the delete reports "blocked" until
// Dexie closes that connection on the versionchange event; moving on at "blocked" let the
// pending delete close the next test's connection instead (seen on slow machines). So this waits
// for success, and a delete that never finishes fails the hook loudly instead of passing stale
// data along.
import "fake-indexeddb/auto";

export function freshDatabase(name = "atlas"): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Couldn't delete ${name}`));
  });
}
