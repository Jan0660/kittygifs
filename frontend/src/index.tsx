import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import { KittyGifsClient, Tag, TagCategory, UserInfo } from "./client/Client";
import localforage from "localforage";
import { AxiosError } from "axios";
import "./skybord-components.css";
import "./skybord-main.css";
import { Accessor, createSignal } from "solid-js";
import { emit, listen } from '@tauri-apps/api/event'
import toast from "solid-toast";

interface Config {
    token?: string;
    apiUrl: string;
    enableSync?: boolean;
}

export interface Settings {
    enableSyncByDefault: boolean;
    groupTextInput: boolean;
    searchHighlight: boolean;
    searchHighlightInPopup: boolean;
    defaultGroup?: string;
    queryPrepend: string;
    limit: number;
    timestamp: number;
}

export interface SettingsSync {
    /** Username, not present if not synced from server */
    _id?: string;
    data: Settings;
    checkedTimestamp?: number;
}

let configItem = (await localforage.getItem("kittygifs.config")) as Config;

if (!configItem) {
    configItem = {
        apiUrl: import.meta.env.VITE_API_URL,
    };
    // await localforage.setItem("kittygifs.config", item);
}

export let config = configItem;

export const saveConfig = async () => {
    await localforage.setItem("kittygifs.config", config);
    if (window.__TAURI_IPC__ != null) {
        emit("configChanged", config);
    }
};

globalThis.config = config;
globalThis.saveConfig = saveConfig;

let settingsItem = (await localforage.getItem("kittygifs.settings")) as SettingsSync;

if (!settingsItem) {
    settingsItem = {
        data: {
            enableSyncByDefault: true,
            groupTextInput: false,
            searchHighlight: false,
            searchHighlightInPopup: false,
            defaultGroup: null,
            queryPrepend: "",
            limit: 40,
            timestamp: 0,
        },
    };
    // await localforage.setItem("kittygifs.settings", item);
}

export let settings = settingsItem;

let syncSettings: null | (() => void) = null;

export const saveSettings = async (doNotSync?: boolean) => {
    await localforage.setItem("kittygifs.settings", settings);
    if (window.__TAURI_IPC__ != null) {
        emit("settingsChanged", settings);
    }
    if (config.token != null && config.enableSync && !doNotSync) {
        settings.data.timestamp = Math.floor(Date.now() / 1000);
        settings.checkedTimestamp = Date.now();
        // sync the change 1s after the last change
        let ss = () => {
            client.sync.setSettings(settings.data).then(() => {
                syncSettings = null;
            });
        };
        syncSettings = ss;
        setTimeout(() => {
            if (syncSettings === ss) {
                ss();
            }
        }, 1000);
    }
}

globalThis.settings = settings;
globalThis.saveSettings = saveSettings;

if (window.__TAURI_IPC__ != null) {
    listen("configChanged", (event) => {
        // @ts-ignore
        config = event.payload;
    });
    listen("settingsChanged", (event) => {
        // @ts-ignore
        settings = event.payload;
    });
}

export let client = new KittyGifsClient(config.apiUrl, config.token);

export const initClient = () => {
    client = new KittyGifsClient(config.apiUrl, config.token);
};

// if sync enabled, and token present, and settings not checked in the last 10m, check for new settings
if (config.enableSync && config.token != null && (settings.checkedTimestamp ?? 0) < Date.now() - 10 * 60 * 1000) {
    client.sync.getSettings().then(async settingsSynced => {
        if (settingsSynced.data.timestamp > settings.data.timestamp) {
            settings = settingsSynced;
            settings.checkedTimestamp = Date.now();
            await saveSettings(true);
        } else {
            client.sync.setSettings(settings.data);
        }
    });
}

class StoredStore<T> {
    public store: T | null = null;
    public lastFetch = 0;
}

class Store<T> extends StoredStore<T> {
    private storeKey: string;
    public cacheDuration: number;
    public getStore: Accessor<T>;
    public setStore: (store: T) => void;
    private fetchFunc: () => Promise<T | null>;
    constructor(storeKey: string, cacheDuration: number, fetchFunc: () => Promise<T>) {
        super();
        this.storeKey = storeKey;
        this.cacheDuration = cacheDuration;
        [this.getStore, this.setStore] = createSignal(this.store);
        this.fetchFunc = fetchFunc;
    }
    async load(check = true) {
        const stored = (await localforage.getItem(this.storeKey)) as StoredStore<T> | null;
        if (stored != null) {
            this.store = stored.store;
            this.setStore(stored.store);
            this.lastFetch = stored.lastFetch;
        }
        if (check) {
            this.get();
        }
    }
    async get(force = false): Promise<T> {
        if (this.store == null || this.lastFetch < Date.now() - this.cacheDuration || force) {
            this.store = await this.fetchFunc();
            this.setStore(this.store);
            this.lastFetch = Date.now();
        }
        return this.store;
    }
    async getSave(force = true): Promise<T> {
        const store = await this.get(force);
        await this.save();
        return store;
    }
    set(store: T) {
        this.store = store;
        this.setStore(store);
        this.lastFetch = Date.now();
    }
    async save() {
        await localforage.setItem(this.storeKey, {store: this.store, lastFetch: this.lastFetch});
    }
    async setSave(store: T) {
        this.set(store);
        await this.save();
    }
    async clear() {
        this.store = null;
        this.setStore(null);
        this.lastFetch = 0;
        await localforage.removeItem(this.storeKey);
    }
}

export const notificationStore = new Store<number>("kittygifs.notificationsCount", 5 * 60 * 1000, async () => {
    if (config.token == null) {
        return 0;
    }
    return await client.notifications.getCount();
});
await notificationStore.load();

export const userInfo = new Store<UserInfo>("kittygifs.userInfo", 20 * 60 * 1000, async () => {
    if (config.token == null) {
        return null;
    }
    return await client.users.getUserInfo("self");
});
await userInfo.load();

export const tagsStore = new Store<Tag[]>("kittygifs.tags", 20 * 60 * 1000, async () => {
    return await client.tags.getAll();
});
await tagsStore.load();

export const tagCategories = new Store<TagCategory[]>("kittygifs.tagCategories", 20 * 60 * 1000, async () => {
    return await client.tags.categories.getAll();
});
await tagCategories.load();

export function getErrorString(e: Error): string {
    if (e instanceof AxiosError) {
        if (e.response?.data?.error) {
            return e.response.data.error;
        }
        return e.response?.statusText != null
            ? `${e.response.statusText} (${e.response.status})`
            : e.message;
    }
    return e.toString();
}

export function toastSave(promise: Promise<any>) {
    toast.promise(promise, {
        loading: "Saving...",
        success: "Saved!",
        error: (e: Error) => "Failed to save: " + getErrorString(e),
    })
}

export function applyTagImplications(tags: string[]): string[] {
    const newTags = [...tags];
    for (const tag of tags) {
        const tagObj = tagsStore.getStore().find(t => t.name == tag);
        if (tagObj?.implications != null) {
            for (const implication of tagObj.implications) {
                if (!newTags.includes(implication)) {
                    newTags.push(implication);
                }
            }
        }
    }
    return newTags;
};

render(
    () => (
        <Router>
            <App />
        </Router>
    ),
    document.getElementById("app"),
);
