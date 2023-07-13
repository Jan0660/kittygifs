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
                                        <SearchHighlight gif={gif} query={query()}></SearchHighlight>
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
