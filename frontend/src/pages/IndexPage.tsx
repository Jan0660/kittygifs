import { createSignal, type Component, Show, For } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import QueryInput from "../QueryInput";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { config } from "..";
import { SearchHighlight } from "../components/SearchHighlight";

const IndexPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);
    const [query, setQuery] = createSignal('');

    return (
        <>
            <div class="content-header">
                <h2>Home page</h2>
            </div>
            <div class="content-content">

                <QueryInput setGifs={setGifs} setQuery={setQuery} />

                <div class="gifs">
                    <For each={gifs()}>
                        {(gif, i) => (
                            <a href={`/gifs/${gif.id}`} style="width: 100%; height: auto;" class="gif-link">
                                <GifPreviewSingle gif={gif} tryForceCache />
                                <Show when={config.searchHighlight}>
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

export default IndexPage;
