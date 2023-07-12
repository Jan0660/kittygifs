import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import { KittyGifsClient } from "./client/Client";
import localforage from "localforage";
import { AxiosError } from "axios";

interface Config {
    token?: string;
}

let item = (await localforage.getItem("kittygifs.config")) as Config;

if (!item) {
    item = {};
    await localforage.setItem("kittygifs.config", item);
}

export const config = item;

export const saveConfig = async () => {
    await localforage.setItem("kittygifs.config", config);
};

export const client = new KittyGifsClient("http://localhost:8234", config.token);

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