import { createSignal, type Component, Show, For, createEffect } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import QueryInput from "../QueryInput";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { client, config } from "..";
import { SearchHighlight } from "../components/SearchHighlight";
import { A } from "@solidjs/router";

const IndexPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);
    const [query, setQuery] = createSignal('');

    return (
        <>
            <div class="content-header">
                <h1>Home page</h1>
            </div>
            <div class="content-content">

                <QueryInput setGifs={setGifs} setQuery={setQuery} />

                <div class="gifs">
                    <For each={gifs()}>
                        {(gif, i) => (
                            <A href={`/gifs/${gif.id}`} style="width: 100%; height: auto;" class="gif-link">
                                <GifPreviewSingle gif={gif} tryForceCache />
                                <Show when={config.searchHighlight}>
                                    <SearchHighlight gif={gif} query={query()}></SearchHighlight>
                                </Show>
                            </A>
                        )}
                    </For>
                </div>
                <button class="button" onClick={async () => {
                    setGifs(gifs().concat(await client.searchGifs(query(), null, {skip: gifs().length})));
                }}>Load more</button>
            </div>
        </>
    );
};

export default IndexPage;
