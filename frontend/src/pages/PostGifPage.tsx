import { Accessor, Component, Suspense, createSignal } from "solid-js";
import { Gif } from "../client/Client";
import { useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { GifViewData } from "../App";
import { client, getErrorString } from "..";

const PostGifPage: Component = () => {
    const [error, setError] = createSignal("");
    const [url, setUrl] = createSignal("");
    const [tags, setTags] = createSignal([] as string[]);
    const [note, setNote] = createSignal("");
    return (
        <>
            <h1>Post Gif</h1>
            <div class="error">
                {error() == "" ? <></> : <p>{error()}</p>}
            </div>
            <input
                type="text"
                placeholder="URL"
                value={url()}
                onInput={e => setUrl(e.currentTarget.value)}
            />
            <br />
            <input
                type="text"
                placeholder="Tags"
                value={tags().join(" ")}
                onInput={e => setTags(e.currentTarget.value.split(" "))}
            />
            <br />
            <input
                type="text"
                placeholder="Note"
                value={note()}
                onInput={e => setNote(e.currentTarget.value)}
            />
            <br />
            <button
                onClick={async () => {
                    try {
                        const gif = await client.postGif({
                            url: url(),
                            tags: tags(),
                            note: note(),
                            private: false,
                        });
                        window.location.href = `/gifs/${gif.id}`;
                    } catch (e) {
                        setError(getErrorString(e));
                    }
                }}
            >
                Post Gif
            </button>
        </>
    );
};

export default PostGifPage;
