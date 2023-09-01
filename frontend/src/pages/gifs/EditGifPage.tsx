import { Component, Show, createEffect, createSignal } from "solid-js";
import { useNavigate, useRouteData, useSearchParams } from "@solidjs/router";
import { GifViewData } from "../../App";
import { client, getErrorString, userInfo } from "../..";
import { GifPreviewSingle } from "../../components/GifPreviewSingle";
import { GroupSelect } from "../../components/GroupSelect";
import { TagsDiff } from "../../components/TagsDiff";

const EditGifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const navigate = useNavigate();
    const [searchParams, _] = useSearchParams();
    const gifEditSuggestion = searchParams["gifEditSuggestion"];

    const [tags, setTags] = createSignal([]);
    const [note, setNote] = createSignal('');
    const [error, setError] = createSignal("");
    const [group, setGroup] = createSignal("none");

    createEffect(() => {
        if (gif()) {
            setTags(gif().tags)
            setNote(gif().note)
            setGroup(gif().group == `@${userInfo.getStore()?.username}` ? "private" : gif().group ?? "none")
        }
    })
    if (gifEditSuggestion) {
        client.notifications.getByEventId(gifEditSuggestion).then((notif) => {
            if (notif.data.type == "gifEditSuggestion") {
                setTags(notif.data.tags)
                setNote(notif.data.note)
            }
        })
    }

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
                    <TagsDiff oldTags={gif().tags} newTags={tags} />
                    <b>Tags</b>
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
                    <Show when={gif().note} fallback={<p><b>No note in original</b></p>}>
                        <p>{gif().note}</p>
                    </Show>
                    <textarea
                        value={note()}
                        class="input"
                        onInput={e => {
                            setNote(e.currentTarget.value);
                        }}
                    />
                    <br />
                    <GroupSelect groupAccessor={group} groupSetter={setGroup} />
                    <br />
                    <button
                        onClick={async () => {
                            setError("");
                            try {
                                await client.gifs.patch(gif().id, {
                                    tags: tags(),
                                    note: note(),
                                    group: group() == "none" ? "" : group(),
                                }, gifEditSuggestion);
                                navigate(`/gifs/${gif().id}`);
                            } catch (e) {
                                setError(getErrorString(e));
                            }
                        }}
                        class="button primary"
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
