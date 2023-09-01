import { createSignal, type Component, Show, For } from "solid-js";
import { Tag, TagCategory, hasGroup } from "../../client/Client";
import "../../index.css";
import { client, getErrorString, tagCategories, toastSave, userInfo } from "../..";
import { useParams, useSearchParams } from "@solidjs/router";
import toast from "solid-toast";

const TagPage: Component = () => {
    const params = useParams();
    console.log(params);
    const categoryName = params["category"] ?? "";
    const [invalid, setInvalid] = createSignal(false);
    const [category, setCategory] = createSignal(null as TagCategory | null);
    tagCategories
        .getSave()
        .then(categories => {
            const category = categories.find(category => category.name == categoryName);
            if (category == undefined) {
                setInvalid(true);
                return;
            }
            setCategory(category);
        })
        .catch(err => {
            setInvalid(true);
        });
    const canEdit = hasGroup("perm:edit_tags", userInfo.getStore()?.groups);

    return (
        <>
            <div class="content-header">
                <h1>Tag Category: {categoryName}</h1>
            </div>
            <div class="content-content">
                <Show
                    when={category() != null}
                    fallback={
                        <>
                            <Show when={invalid()} fallback={<h2>Loading...</h2>}>
                                <h2>Invalid tag category.</h2>
                            </Show>
                        </>
                    }
                >
                    <label>Name: </label>
                    <input type="text" class="input" value={category().name} onChange={e => {
                        setCategory({ ...category(), name: e.currentTarget.value });
                    }} />
                    <br />
                    <label>Description</label>
                    <br />
                    <textarea
                        value={category().description ?? ""}
                        class="input"
                        disabled={!canEdit}
                        onInput={e => {
                            setCategory({
                                ...category(),
                                description:
                                    e.currentTarget.value == "" ? null : e.currentTarget.value,
                            });
                        }}
                    />
                    <br />
                    <label>Color</label>
                    <br />
                    <input
                        value={"#" + category().color ?? ""}
                        // class="input"
                        type="color"
                        disabled={!canEdit}
                        onInput={e => {
                            setCategory({
                                ...category(),
                                color: e.currentTarget.value.substring(1),
                            });
                        }}
                    />
                    <button class="button" onClick={() => {
                        setCategory({ ...category(), color: null });
                    }}>Clear</button>
                    <br />
                    <Show when={canEdit}>
                        <button
                            onClick={() => {
                                toastSave(client.tags.categories.patch(categoryName, category()));
                            }}
                            class="button primary"
                        >
                            Save
                        </button>
                    </Show>
                </Show>
            </div>
        </>
    );
};

export default TagPage;
