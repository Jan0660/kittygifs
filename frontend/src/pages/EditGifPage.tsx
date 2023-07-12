import { Component, Suspense, createSignal } from "solid-js";
import { useRouteData } from "@solidjs/router";
import { GifViewData } from "../App";
import GifPage from "./GifPage";
import { client, getErrorString } from "..";
import { AxiosError } from "axios";

const EditGifPage: Component = () => {
    const gif = useRouteData<typeof GifViewData>();
    const [tags, setTags] = createSignal(gif().tags);
    const [note, setNote] = createSignal(gif().note);
    const [getPrivate, setPrivate] = createSignal(gif().private);
    const [error, setError] = createSignal("");
    return (
        <Suspense fallback={<h1>Loading... :)</h1>}>
            <h1>Edit Gif</h1>
            <h2>Editing</h2>
            {error() == "" ? <></> : <p>{error()}</p>}
            <input
                type="text"
                value={tags().join(" ")}
                onInput={e => {
                    setTags(e.currentTarget.value.split(" "));
                }}
            />
            <br />
            <textarea
                value={note()}
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
            <button
                onClick={async () => {
                    setError("");
                    try {
                        await client.patchGif(gif().id, {
                            tags: tags(),
                            note: note(),
                            private: getPrivate(),
                        });
                        window.location.href = `/gifs/${gif().id}`;
                    } catch (e) {
                        setError(getErrorString(e));
                    }
                }}
            >
                Save
            </button>

            <h2>Original Post</h2>
            <GifPage />
        </Suspense>
    );
};

export default EditGifPage;
