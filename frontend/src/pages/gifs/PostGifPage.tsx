import { Component, For, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { client, config, getErrorString, settings } from "../..";
import { GroupSelect } from "../../components/GroupSelect";
import { TagSpan } from "../../components/TagSpan";

const PostGifPage: Component = () => {
    const navigate = useNavigate();
    const [error, setError] = createSignal("");
    const [url, setUrl] = createSignal("");
    const [tags, setTags] = createSignal([] as string[]);
    const [note, setNote] = createSignal("");
    const [group, setGroup] = createSignal(settings.data.defaultGroup ?? "none");
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
                    {tag => <TagSpan tagName={tag} />}
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
                <GroupSelect groupAccessor={group} groupSetter={setGroup} />
                <br />
                <button
                    onClick={async () => {
                        try {
                            const gif = await client.postGif({
                                url: url(),
                                tags: tags(),
                                note: note(),
                                group: group() == "none" ? "" : group(),
                            });
                            navigate(`/gifs/${gif.id}`);
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                    class="button confirm"
                >
                    Post Gif
                </button>
            </div>
        </>
    );
};

export default PostGifPage;
