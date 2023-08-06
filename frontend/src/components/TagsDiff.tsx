import { Accessor, For, JSX, createEffect, createSignal } from "solid-js";

export const TagsDiff = ({
    oldTags,
    newTags,
}: {
    oldTags: string[];
    newTags: Accessor<string[]>;
}) => {
    const [diff, setDiff] = createSignal([] as string[]);
    createEffect(() => {
        // if both array contain the same element, include it in the diff with no changes
        // if the old array contains an element that the new array does not, include it in the diff with a -
        // if the new array contains an element that the old array does not, include it in the diff with a +
        const diff: string[] = [];
        for (const tag of oldTags) {
            if (newTags().includes(tag)) {
                diff.push(tag);
            } else {
                diff.push("-" + tag);
            }
        }
        for (const tag of newTags()) {
            if (!oldTags.includes(tag)) {
                diff.push("+" + tag);
            }
        }
        setDiff(diff);
    });
    return (
        <div style={"overflow-wrap: anywhere"}>
            <For each={diff()}>
                {tag => {
                    let style: JSX.CSSProperties = {};
                    if (tag.startsWith("-")) {
                        style = {
                            "background-color": "red",
                        };
                    } else if (tag.startsWith("+")) {
                        style = {
                            "background-color": "green",
                        };
                    }
                    return (
                        <span class="tag" style={style}>
                            {tag}
                        </span>
                    )
                }}
            </For>
        </div>
    );
};
