import { Component, For, Show, createSignal } from "solid-js";
import { A, useNavigate, useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../../GifPreviewSingle";
import { GifViewData } from "../../App";
import { client, config, getErrorString, userInfo } from "../..";
import { decodeTime } from "ulid";
import { hasGroup } from "../../client/Client";

const GifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const navigate = useNavigate();
    const [deleteAreYouSure, setDeleteAreYouSure] = createSignal(false);
    return (
        <>
            <div class="content-header">
                <h1>Viewing Gif information</h1>
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
                            <div class="tooltip">
                                <div class="tooltiptext">
                                    Click to copy!
                                </div>
                                Url: <code style={{ "cursor": "pointer" }} onClick={() => {
                                    navigator.clipboard.writeText(gif().url);
                                }}>
                                    {gif().url}
                                </code>
                            </div>
                        </div>

                        <Show when={gif().note}>
                            <h4>Note</h4>
                            <p>{gif().note}</p>
                        </Show>

                        <Show when={gif().group}>
                            Group: <code>{gif().group}</code>
                        </Show>

                        <div class="card-footer">
                            {gif().id} - {(new Date(decodeTime(gif().id))).toLocaleString()}
                        </div>
                    </div>
                    <br />
                    <Show when={config.token}>
                        <div class="card">
                            <div class="card-header">
                                Actions
                            </div>
                            <span>
                                <A class="button" href={`/gifs/${gif().id}/edit/suggest`}>Suggest Edit</A>
                                <Show when={hasGroup("perm:edit_all_gifs", userInfo.info.groups) || userInfo.info.username == gif().uploader}>
                                    <A class="button" href={`/gifs/${gif().id}/edit`}>Edit</A>
                                </Show>
                                <Show when={hasGroup("perm:delete_all_gifs", userInfo.info.groups) || userInfo.info.username == gif().uploader}>
                                    <Show
                                        when={deleteAreYouSure()}
                                        fallback={<button class="button danger" onClick={() => setDeleteAreYouSure(true)}>Delete</button>}
                                    >
                                        <button
                                            class="button confirm"
                                            onClick={async () => {
                                                try {
                                                    await client.deleteGif(gif().id);
                                                    navigate("/");
                                                } catch (e) {
                                                    alert(getErrorString(e));
                                                }
                                            }}
                                        >
                                            Are you sure?
                                        </button>
                                    </Show>
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
