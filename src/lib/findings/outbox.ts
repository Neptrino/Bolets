"use client";

import type { FindingOutboxRecord } from "@/src/lib/findings/types";

const DATABASE = "bolets-field-notebook";
const STORE = "finding-outbox";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "draft.clientReportId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const request = operation(database.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export function saveOutboxFinding(record: FindingOutboxRecord) {
  return transaction("readwrite", (store) => store.put(record));
}

export function deleteOutboxFinding(clientReportId: string) {
  return transaction("readwrite", (store) => store.delete(clientReportId));
}

export async function listOutboxFindings() {
  const records = await transaction("readonly", (store) => store.getAll());
  return records as FindingOutboxRecord[];
}

export async function updateOutboxFinding(clientReportId: string, patch: Partial<FindingOutboxRecord>) {
  const records = await listOutboxFindings();
  const current = records.find((record) => record.draft.clientReportId === clientReportId);
  if (!current) return;
  await saveOutboxFinding({ ...current, ...patch, updatedAt: new Date().toISOString() });
}
