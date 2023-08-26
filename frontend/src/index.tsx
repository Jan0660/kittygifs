import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import { KittyGifsClient, UserInfo } from "./client/Client";
import localforage from "localforage";
import { AxiosError } from "axios";
import "./skybord-components.css";
import "./skybord-main.css";
import { createSignal } from "solid-js";
import { emit, listen } from '@tauri-apps/api/event'

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
            client.setSyncSettings(settings.data).then(() => {
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
    client.getSyncSettings().then(async settingsSynced => {
        if (settingsSynced.data.timestamp > settings.data.timestamp) {
            settings = settingsSynced;
            settings.checkedTimestamp = Date.now();
            await saveSettings(true);
        } else {
            client.setSyncSettings(settings.data);
        }
    });
}

export type UserInfoStored = {
    lastFetch: number;
    info: UserInfo;
};

let userInfoStored = (await localforage.getItem("kittygifs.userInfo")) as UserInfoStored | null;

export let userInfo: UserInfoStored | null = userInfoStored;

// if user info stored is older than 20m, fetch new user info
if ((!userInfo || userInfo.lastFetch < Date.now() - 20 * 60 * 1000) && config.token != null) {
    client.getUserInfo("self").then(async info => {
        userInfo = await localforage.setItem("kittygifs.userInfo", {
            lastFetch: Date.now(),
            info: info,
        });
    });
}

export const deleteUserInfo = async () => {
    await localforage.removeItem("kittygifs.userInfo");
}

globalThis.userInfoStored = userInfoStored;
globalThis.deleteUserInfo = deleteUserInfo;

export type NotificationStore = {
    lastFetch: number;
    count: number;
};

let notificationStoreInner = (await localforage.getItem("kittygifs.notificationStore")) as NotificationStore | null;
const [getNotificationStore, setNotificationStore] = createSignal(notificationStoreInner);

if ((!notificationStoreInner || notificationStoreInner.lastFetch < Date.now() - 5 * 60 * 1000) && config.token != null) {
    client.getNotificationsCount().then(count => {
        setNotificationCount(count);
    });
}

export const notificationStore = getNotificationStore;

export const deleteNotificationStore = async () => {
    await localforage.removeItem("kittygifs.notificationStore");
};

export const setNotificationCount = async (count: number) => {
    const store = {
        lastFetch: Date.now(),
        count,
    };
    localforage.setItem("kittygifs.notificationStore", store);
    setNotificationStore(store);
};

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

render(
    () => (
        <Router>
            <App />
        </Router>
    ),
    document.getElementById("app"),
);
