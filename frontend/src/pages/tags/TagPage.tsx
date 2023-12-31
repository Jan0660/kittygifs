import { createSignal, type Component, Show, For } from "solid-js";
import { Tag, hasGroup } from "../../client/Client";
import "../../index.css";
import { client, tagCategories, toastSave, userInfo } from "../..";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";

const TagPage: Component = () => {
    const navigate = useNavigate();
    const params = useParams();
    console.log(params);
    const tagName = params["tag"] ?? "";
    const [invalid, setInvalid] = createSignal(false);
    const [tag, setTag] = createSignal(null as Tag | null);
    client.tags
        .get(tagName)
        .then(tag => {
            setTag(tag);
        })
        .catch(err => {
            setInvalid(true);
        });
    const canEdit = hasGroup("perm:edit_tags", userInfo.getStore()?.groups);
    const canDelete = hasGroup("perm:delete_tags", userInfo.getStore()?.groups);

    const [deleteSure, setDeleteSure] = createSignal(false);
    const [renamed, setRenamed] = createSignal("");

    return (
        <>
            <div class="content-header">
                <h1>Tag: {tagName}</h1>
            </div>
            <div class="content-content">
                <Show
                    when={tag() != null}
                    fallback={
                        <>
                            <Show when={invalid()} fallback={<h2>Loading...</h2>}>
                                <h2>Invalid tag.</h2>
                            </Show>
                        </>
                    }
                >
                    <p>Count: {tag().count}</p>
                    <label>Description</label>
                    <br />
                    <textarea
                        value={tag().description ?? ""}
                        class="input"
                        style="width: 50%; height: 6em;"
                        disabled={!canEdit}
                        onInput={e => {
                            setTag({
                                ...tag(),
                                description:
                                    e.currentTarget.value == "" ? null : e.currentTarget.value,
                            });
                        }}
                    />
                    <br />
                    <label>Category</label>
                    <br />
                    <select
                        value={tag().category ?? "none"}
                        class="input"
                        onChange={e => {
                            setTag({
                                ...tag(),
                                category:
                                    e.currentTarget.value == "none" ? null : e.currentTarget.value,
                            });
                        }}
                        disabled={!canEdit}
                    >
                        <For
                            each={
                                tagCategories
                                    .getStore()
                                    ?.map(category => category.name)
                                    ?.concat("none") ?? ["none"]
                            }
                        >
                            {(category, i) => (
                                <option value={category} selected={tag().category == category}>
                                    {category}
                                </option>
                            )}
                        </For>
                    </select>
                    <br />
                    <label>Implications</label>
                    <br />
                    <input
                        type="text"
                        class="input"
                        disabled={!canEdit}
                        value={tag().implications?.join(" ") ?? ""}
                        placeholder="Implications (space separated list)"
                        onInput={e => {
                            setTag({
                                ...tag(),
                                implications:
                                    e.currentTarget.value == ""
                                        ? null
                                        : e.currentTarget.value.split(" "),
                            });
                        }}
                    />
                    <br />
                    <Show when={canEdit}>
                        <button
                            onClick={() => {
                                toastSave(client.tags.patch(tagName, tag()));
                            }}
                            class="button primary"
                        >
                            Save
                        </button>
                    </Show>
                    <Show when={canDelete}>
                        <Show
                            when={!deleteSure()}
                            fallback={
                                <button
                                    onClick={async () => {
                                        await client.tags.delete(tagName);
                                        window.location.href = "/tags";
                                    }}
                                    class="button danger"
                                >
                                    Are you sure?
                                </button>
                            }
                        >
                            <button
                                onClick={() => {
                                    setDeleteSure(true);
                                }}
                                class="button danger"
                            >
                                Delete with all usages
                            </button>
                        </Show>
                    </Show>
                    <Show when={canEdit}>
                        <h2>Rename Tag</h2>
                        <p>This also allows you to merge this tag into another.</p>
                        <input
                            type="text"
                            class="input"
                            value={renamed()}
                            onInput={e => {
                                setRenamed(e.currentTarget.value);
                            }}
                        />
                        <br />
                        <button
                            onClick={async () => {
                                await client.tags.rename(tagName, renamed());
                                // navigate(`/tags/tag/${renamed()}`);
                                window.location.href = `/tags/tag/${renamed()}`;
                            }}
                            class="button primary"
                        >
                            Rename
                        </button>
                    </Show>
                </Show>
            </div>
        </>
    );
};

export default TagPage;
