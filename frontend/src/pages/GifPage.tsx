import { Accessor, Component, ErrorBoundary, Show, Suspense, createSignal } from "solid-js";
import { Gif } from "../client/Client";
import { useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { GifViewData } from "../App";
import { client, config, getErrorString } from "..";

const GifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const [deleteAreYouSure, setDeleteAreYouSure] = createSignal(false);
    return (
        <Show when={gif()} fallback={<h1>Loading... :)</h1>}>
            <div>
                <p>Id: {gif().id}</p>
                <p>Uploader: {gif().uploader}</p>
                <p>Tags: {gif().tags.join(", ")}</p>
                <a href={gif().url}>Url</a>
                <Show when={gif().note}>
                    <h4>Note</h4>
                    <p>{gif().note}</p>
                </Show>
                <br />
                <Show when={config.token}>
                    <a href={`/gifs/${gif().id}/edit`}>Edit</a>
                    <br />
                    <Show
                        when={deleteAreYouSure()}
                        fallback={<button onClick={() => setDeleteAreYouSure(true)}>Delete</button>}
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
                </Show>
            </div>
            <GifPreviewSingle gif={gif()} />
        </Show>
    );
};

export default GifPage;
