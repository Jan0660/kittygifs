import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import { KittyGifsClient, UserInfo } from "./client/Client";
import localforage from "localforage";
import { AxiosError } from "axios";
import "./skybord-components.css";
import "./skybord-main.css";
import { createSignal } from "solid-js";

interface Config {
    groupTextInput: boolean;
    token?: string;
    searchHighlight: boolean;
    searchHighlightInPopup: boolean;
    apiUrl: string;
    defaultGroup?: string;
    queryPrepend: string;
    limit: number;
}

let item = (await localforage.getItem("kittygifs.config")) as Config;

if (!item) {
    item = {
        groupTextInput: false,
        searchHighlight: true,
        searchHighlightInPopup: false,
        apiUrl: import.meta.env.VITE_API_URL,
        defaultGroup: null,
        queryPrepend: "",
        limit: 50,
    };
    await localforage.setItem("kittygifs.config", item);
}

item.limit ??= 50;

export const config = item;

export const saveConfig = async () => {
    await localforage.setItem("kittygifs.config", config);
};

globalThis.config = config;
globalThis.saveConfig = saveConfig;

export const client = new KittyGifsClient(config.apiUrl, config.token);

export type UserInfoStored = {
    lastFetch: number;
    info: UserInfo;
};

let userInfoStored = (await localforage.getItem("kittygifs.userInfo")) as UserInfoStored | null;

export const userInfo: UserInfoStored | null = userInfoStored;

// if user info stored is older than 20m, fetch new user info
if ((!userInfo || userInfo.lastFetch < Date.now() - 20 * 60 * 1000) && config.token != null) {
    client.getUserInfo("self").then(info => {
        localforage.setItem("kittygifs.userInfo", {
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
        const store = {
            lastFetch: Date.now(),
            count,
        };
        localforage.setItem("kittygifs.notificationStore", store);
        setNotificationStore(store);
    });
}

export const notificationStore = getNotificationStore;

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
