import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import { KittyGifsClient } from "./client/Client";
import localforage from "localforage";
import { AxiosError } from "axios";
import './skybord-components.css'
import './skybord-main.css'

interface Config {
    token?: string;
    searchHighlight: boolean;
    searchHighlightInPopup: boolean;
    apiUrl: string;
    defaultGroup: string;
    queryPrepend: string;
}

let item = (await localforage.getItem("kittygifs.config")) as Config;

if (!item) {
    item = {
        searchHighlight: true,
        searchHighlightInPopup: false,
        apiUrl: import.meta.env.VITE_API_URL,
        defaultGroup: "",
        queryPrepend: "",
    };
    await localforage.setItem("kittygifs.config", item);
}

export const config = item;

export const saveConfig = async () => {
    await localforage.setItem("kittygifs.config", config);
};

globalThis.config = config;
globalThis.saveConfig = saveConfig;

export const client = new KittyGifsClient(config.apiUrl, config.token);

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
