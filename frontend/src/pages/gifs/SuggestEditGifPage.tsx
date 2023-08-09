import { Component, Show, createEffect, createSignal } from "solid-js";
import { useNavigate, useRouteData } from "@solidjs/router";
import { GifPreviewSingle } from "../../components/GifPreviewSingle";
import { GifViewData } from "../../App";
import { client, getErrorString } from "../..";
import { TagsDiff } from "../../components/TagsDiff";

const TagEditSuggestPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const navigate = useNavigate();
    const [error, setError] = createSignal("");
    const [tags, setTags] = createSignal([""]);
    const [note, setNote] = createSignal("");

    createEffect(() => {
        if (gif()) {
            setTags(gif().tags)
            setNote(gif().note)
        }
    })
    
    return (
        <>
            <div class="content-header">
                <h1>Suggest Gif Edit</h1>
            </div>
            <div class="content-content">
                <Show when={gif()} fallback={<h1>Loading... :)</h1>}>
                    <div class="error">
                        {error() == "" ? <></> : <p>{error()}</p>}
                    </div>
                    <div class="card color-border">
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
                    <textarea
                        value={note()}
                        class="input"
                        onInput={e => {
                            setNote(e.currentTarget.value);
                        }}
                    />
                    <br />
                    <button
                        onClick={async () => {
                            setError("");
                            try {
                                await client.postGifEditSuggestion(gif().id, {
                                    tags: tags(),
                                    note: note(),
                                });
                                navigate(`/gifs/${gif().id}`);
                            } catch (e) {
                                setError(getErrorString(e));
                            }
                        }}
                        class="button primary"
                    >
                        Suggest
                    </button>
                    </div>
                    <br />
                    <GifPreviewSingle gif={gif()} />
                </Show>
            </div >
        </>
    );
};

export default TagEditSuggestPage;
