// services/imageStore.ts
const DB_NAME = 'FichaMunecaImageStore';
const STORE_NAME = 'images';
let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = () => reject(new Error("Error opening IndexedDB for images."));
        
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export async function addImage(id: string, base64: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put({ id, base64 });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Error adding image to IndexedDB"));
    });
}

export async function getImage(id: string): Promise<{ base64: string } | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Error getting image from IndexedDB"));
    });
}

export async function deleteImage(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Error deleting image from IndexedDB"));
    });
}
