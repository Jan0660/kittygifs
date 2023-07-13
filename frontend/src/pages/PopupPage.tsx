import { createSignal, type Component, createEffect, For, Show } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import { invoke } from "@tauri-apps/api/tauri";
import { GifPreviewSingle } from "../GifPreviewSingle";
import QueryInput from "../QueryInput";
import { SearchHighlight } from "../components/SearchHighlight";
import { config } from "..";

const PopupPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);
    const [query, setQuery] = createSignal('');

    createEffect(() => { //Focus search bar after window opens
        const queryInput = document.getElementById(
            "queryInput",
        ) as HTMLInputElement;
        queryInput.value = "";
        queryInput.focus();
    })

    const shorten = (url: string) => {
        let match = /^https:\/\/tenor.com\/view\/.*-(?<id>\d+)$/gi.exec(url);
        if (match) {
            return `https://tenor.com/view/${match.groups?.id}`;
        }
        return url;
    };

    const selected = (gif) => {
        invoke("selected", { url: shorten(gif.url) });
        const queryInput = document.getElementById(
            "queryInput",
        ) as HTMLInputElement;
        queryInput.value = "";
        queryInput.focus();
        setGifs([]);
    };

    return (
        <>
            <div class="content-header" style="padding-top: 20px">
                <h1>Search for gifs...</h1>
            </div>
            <div class="content-content">
                <style>
                    {".navbar { display: none; }"}
                </style>

                <QueryInput setGifs={setGifs} setQuery={setQuery} />
                Pro tip: you can use tab and shift + tab to cycle between gifs, and use enter to send

                <div class="gifs">
                    <For each={gifs()}>
                        {(gif, i) => (
                            <a href='#' style="width: 100%; height: auto;" onClick={() => (selected(gif))} class="gif-link">
                                <GifPreviewSingle gif={gif} tryForceCache height={config.searchHighlightInPopup ? null : "100%"} />
                                <Show when={config.searchHighlightInPopup}>
                                    <SearchHighlight gif={gif} query={query()}></SearchHighlight>
                                </Show>
                            </a>
                        )}
                    </For>
                </div>
            </div>
        </>
    );
};

export default PopupPage;
