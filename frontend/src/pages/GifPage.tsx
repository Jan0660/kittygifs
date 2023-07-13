import { Accessor, Component, ErrorBoundary, For, Show, Suspense, createSignal } from "solid-js";
import { Gif } from "../client/Client";
import { useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { GifViewData } from "../App";
import { client, config, getErrorString } from "..";

const GifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    console.log(gif())
    const [deleteAreYouSure, setDeleteAreYouSure] = createSignal(false);
    return (
        <>
            <div class="content-header">
                <h2>Viewing Gif information</h2>
            </div>
            <div class="content-content">
                <Show when={gif()} fallback={<h1>Loading... :)</h1>}>
                    <div class="card color-border">
                        <div class="card-header">
                            Uploaded by <b>{gif().uploader}</b>
                        </div>
                        <p>Tags:
                            <For each={gif().tags}>
                                {tag => {
                                    return (
                                        <span class="tag">
                                            {tag}
                                        </span>
                                    )
                                }}
                            </For>
                        </p>
                        <div style="word-wrap: break-word">
                            Url: <code>
                                {gif().url}
                            </code>
                        </div>

                        <Show when={gif().note}>
                            <h4>Note</h4>
                            <p>{gif().note}</p>
                        </Show>

                        <div class="card-footer">
                            {gif().id}
                        </div>
                    </div>
                    <br />
                    <Show when={config.token}>
                        <div class="card">
                            <div class="card-header">
                                Actions
                            </div>
                            <span>
                                <a class="button" href={`/gifs/${gif().id}/edit`}>Edit</a>
                                <Show
                                    when={deleteAreYouSure()}
                                    fallback={<button class="button danger" onClick={() => setDeleteAreYouSure(true)}>Delete</button>}
                                >
                                    <button
                                        onClick={async () => {
                                            try {
                                                await client.deleteGif(gif().id);
                                                window.location.href = "/";
                                            } catch (e) {
                                                alert(getErrorString(e));
                                            }
                                        }}
                                    >
                                        Are you sure?
                                    </button>
                                </Show>
                            </span>
                        </div>
                    </Show>
                    <GifPreviewSingle gif={gif()} />
                </Show>
            </div >
        </>
    );
};

export default GifPage;
