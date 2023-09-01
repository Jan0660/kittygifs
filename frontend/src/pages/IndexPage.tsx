import { createSignal, type Component, Show, For, createEffect } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import QueryInput from "../components/QueryInput";
import { GifPreviewSingle } from "../components/GifPreviewSingle";
import { client, config, settings } from "..";
import { SearchHighlight } from "../components/SearchHighlight";
import { A, useSearchParams } from "@solidjs/router";

const IndexPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = createSignal(searchParams["q"] ?? "");
    createEffect(() => {
        setSearchParams({ q: query() }, { replace: true });
    });

    return (
        <>
            <div class="content-header">
                <h1>Home page</h1>
            </div>
            <div class="content-content">
                <QueryInput setGifs={setGifs} query={query} setQuery={setQuery} />

                <div class="gifs">
                    <For each={gifs()}>
                        {(gif, i) => (
                            <A
                                href={`/gifs/${gif.id}`}
                                style="width: 100%; height: auto;"
                                class="gif-link"
                            >
                                <GifPreviewSingle gif={gif} tryForceCache />
                                <Show when={settings.data.searchHighlight}>
                                    <SearchHighlight gif={gif} query={query()}></SearchHighlight>
                                </Show>
                            </A>
                        )}
                    </For>
                </div>
                <button
                    class="button"
                    onClick={async () => {
                        setGifs(
                            gifs().concat(
                                await client.gifs.search(query(), null, { skip: gifs().length, max: settings.data.limit }),
                            ),
                        );
                    }}
                >
                    Load more
                </button>
            </div>
        </>
    );
};

export default IndexPage;
