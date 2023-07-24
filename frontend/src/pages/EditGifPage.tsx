import { Component, For, Show, Suspense, createEffect, createSignal } from "solid-js";
import { useNavigate, useRouteData } from "@solidjs/router";
import { GifViewData } from "../App";
import GifPage from "./GifPage";
import { client, getErrorString, userInfo } from "..";
import { AxiosError } from "axios";
import { GifPreviewSingle } from "../GifPreviewSingle";
import { GroupSelect } from "../components/GroupSelect";

const EditGifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const navigate = useNavigate();

    const [tags, setTags] = createSignal([]);
    const [note, setNote] = createSignal('');
    const [getPrivate, setPrivate] = createSignal(false);
    const [error, setError] = createSignal("");
    const [group, setGroup] = createSignal("none");

    createEffect(() => {
        if (gif()) {
            setTags(gif().tags)
            setNote(gif().note)
            setPrivate(gif().private)
            setGroup(gif().group == `@${userInfo?.info?.username}` ? "private" : gif().group ?? "none")
        }
    })

    return (
        <>
            <div class="content-header">
                <h1>Edit Gif</h1>
            </div>
            <div class="content-content">

                <Show when={gif()} fallback={<h1>Loading... :)</h1>}>
                    <h2>Details</h2>
                    <div class="error">
                        {error() == "" ? <></> : <p>{error()}</p>}
                    </div>
                    <For each={tags()}>
                        {tag => {
                            return (
                                <span class="tag">
                                    {tag}
                                </span>
                            )
                        }}
                    </For><br />
                    <b>Tag</b>
                    <input
                        type="text"
                        value={tags().join(" ")}
                        class="input"
                        onInput={e => {
                            setTags(e.currentTarget.value.split(" "));
                        }}
                    />
                    <br />
                    <b>Note</b><br />
                    <textarea
                        value={note()}
                        class="input"
                        onInput={e => {
                            setNote(e.currentTarget.value);
                        }}
                    />
                    <br />
                    <label>
                        <input
                            type="checkbox"
                            checked={getPrivate()}
                            onInput={e => {
                                setPrivate(e.currentTarget.checked);
                            }}
                        />
                        Private
                    </label>
                    <br />
                    <GroupSelect groupAccessor={group} groupSetter={setGroup} />
                    <br />
                    <button
                        onClick={async () => {
                            setError("");
                            try {
                                await client.patchGif(gif().id, {
                                    tags: tags(),
                                    note: note(),
                                    private: getPrivate(),
                                    group: group() == "none" ? "" : group(),
                                });
                                navigate(`/gifs/${gif().id}`);
                            } catch (e) {
                                setError(getErrorString(e));
                            }
                        }}
                    >
                        Save
                    </button>

                    <h2>Original Post</h2>
                    <GifPreviewSingle gif={gif()} />
                </Show>
            </div>
        </>
    );
};

export default EditGifPage;
