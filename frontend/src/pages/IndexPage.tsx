import { createSignal, type Component, Show } from "solid-js";
import { Gif } from "../client/Client";
import "../index.css";
import QueryInput from "../QueryInput";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { config } from "..";

const IndexPage: Component = () => {
    const [gifs, setGifs] = createSignal([] as Gif[]);

    return (
        <>
            <Show when={config.token != null}>
                <a href="/gifs/post">Post</a>
                <br />
            </Show>
            <QueryInput setGifs={setGifs} />

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
                                <GifPreviewSingle gif={gif} tryForceCache />
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
            <Show when={config.token == null}>
                <a href="/login">Login</a><br/>
                <a href="/signup">Signup</a>
            </Show>
            <Show when={config.token != null}>
                <a href="/logout">Log out</a> <br />
                <a href="/resetPassword">Reset Password</a>
            </Show>
        </>
    );
};

export default IndexPage;
