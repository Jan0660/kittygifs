import { Accessor, Component, For, Suspense, createSignal } from "solid-js";
import { Gif } from "../client/Client";
import { useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { GifViewData } from "../App";
import { client, config, getErrorString } from "..";

const PostGifPage: Component = () => {
    const [error, setError] = createSignal("");
    const [url, setUrl] = createSignal("");
    const [tags, setTags] = createSignal([] as string[]);
    const [note, setNote] = createSignal("");
    const [group, setGroup] = createSignal(config.defaultGroup ?? "");
    return (
        <>
            <div class="content-header">
                <h1>Post Gif</h1>

            </div>
            <div class="content-content">

                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <input
                    type="text"
                    placeholder="URL"
                    value={url()}
                    class="input"
                    onInput={e => setUrl(e.currentTarget.value)}
                />
                <br />
                <For each={tags()}>
                    {tag => {
                        return (
                            <span class="tag">
                                {tag}
                            </span>
                        )
                    }}
                </For><br />
                <input
                    type="text"
                    placeholder="Tags"
                    value={tags().join(" ")}
                    class="input"
                    onInput={e => setTags(e.currentTarget.value.split(" "))}
                />
                <br />
                <textarea
                    placeholder="Note"
                    value={note()}
                    class="input"
                    onInput={e => setNote(e.currentTarget.value)}
                />
                <br />
                <input
                    type="text"
                    placeholder="Group"
                    value={group() ? group() : ""}
                    class="input"
                    onInput={e => setGroup(e.currentTarget.value)}
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
                                group: group(),
                            });
                            window.location.href = `/gifs/${gif.id}`;
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                >
                    Post Gif
                </button>
            </div>
        </>
    );
};

export default PostGifPage;
