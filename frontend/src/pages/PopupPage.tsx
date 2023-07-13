import { createSignal, type Component, createEffect } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import { invoke } from "@tauri-apps/api/tauri";
import { GifPreviewSingle } from "../GifPreviewSingle";
import QueryInput from "../QueryInput";
import { SearchHighlight } from "../components/SearchHighlight";

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

                <div class="gifs">
                    {(() => {
                        let tabIndex = 0;
                        const columnCount = 3;
                        const columns = [];
                        for (let i = 0; i < columnCount; i++) {
                            columns.push([]);
                        }
                        gifs().forEach((gif, i) => {
                            const shorten = (url: string) => {
                                let match = /^https:\/\/tenor.com\/view\/.*-(?<id>\d+)$/gi.exec(url);
                                if (match) {
                                    return `https://tenor.com/view/${match.groups?.id}`;
                                }
                                return url;
                            };
                            const selected = () => {
                                invoke("selected", { url: shorten(gif.url) });
                                const queryInput = document.getElementById(
                                    "queryInput",
                                ) as HTMLInputElement;
                                queryInput.value = "";
                                queryInput.focus();
                                setGifs([]);
                            };
                            columns[i % columnCount].push(
                                <GifPreviewSingle gif={gif} onClick={selected} tryForceCache tabIndex={tabIndex++} />,
                                <SearchHighlight gif={gif} query={query()} />
                            );
                            return;
                        });
                        return columns.map(col => (
                            <div class="col" style={{ "max-width": `calc(100% / ${columnCount})` }}>
                                {col}
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </>
    );
};

export default PopupPage;
