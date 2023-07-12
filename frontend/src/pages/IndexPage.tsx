import { createSignal, type Component, Show, For } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import QueryInput from "../QueryInput";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { config } from "..";

const IndexPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);
    const [query, setQuery] = createSignal('');

    return (
        <>
            <div class="content-header">

                <QueryInput setGifs={setGifs} setQuery={setQuery} />

                <div class="gifs">
                    {(() => {
                        const columnCount = 3;
                        const columns = [];
                        for (let i = 0; i < columnCount; i++) {
                            columns.push([]);
                        }
                        gifs().forEach((gif, i) => {
                            columns[i % columnCount].push(
                                <a href={`/gifs/${gif.id}`}>
                                    <div style="display: grid; grid-template-rows: auto auto">
                                        <GifPreviewSingle gif={gif} tryForceCache />
                                        <For each={gif.tags}>
                                            {(tag, i) => {
                                                //SEARCH HIGHLIGHTING
                                                //First see if the search is present in the tag
                                                const search = tag.match(query())
                                                if (!search) { //If not then dont return it
                                                    return (<></>
                                                    )
                                                }
                                                //If so then split it into parts. (Could be multiple parts matching the query!)
                                                const parts = tag.split(search[0])
                                                    .reduce((list, elem, i) => {
                                                        list.push(elem);
                                                        if (i == list.length - 1)
                                                            list.push(search[0]);
                                                        return list;
                                                    }, []);
                                                console.log(parts)
                                                return (
                                                    <span class="tag">
                                                        <For each={parts}>
                                                            {(part, i) => (
                                                                <span>
                                                                    <Show when={part == search}>
                                                                        <span style="background-color: rgba(255, 255, 0, 0.5)">
                                                                            {part}
                                                                        </span>
                                                                    </Show>
                                                                    <Show when={part != search}>
                                                                        {part}
                                                                    </Show>
                                                                </span>
                                                            )}
                                                        </For>
                                                    </span>
                                                )
                                            }
                                            }
                                        </For>
                                    </div>
                                </a>,
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

export default IndexPage;
