import { Accessor, For, Setter, Show } from "solid-js";
import { config, settings, userInfo } from "..";

export const GroupSelect = ({
    groupAccessor,
    groupSetter,
}: {
    groupAccessor: Accessor<string>;
    groupSetter: Setter<string>;
}) => {
    return (
        <>
            <label>
                Group:{" "}
                <Show when={!settings.data.groupTextInput && userInfo?.info?.groups}>
                    <select
                        value={groupAccessor()}
                        class="input"
                        onChange={e => groupSetter(e.currentTarget.value)}
                    >
                        <For
                            each={
                                userInfo.info.groups?.concat("private", "none") ?? [
                                    "private",
                                    "none",
                                ]
                            }
                        >
                            {(group, i) => (
                                <option value={group} selected={groupAccessor() == group}>
                                    {group}
                                </option>
                            )}
                        </For>
                    </select>
                </Show>
                <Show when={settings.data.groupTextInput}>
                    <input
                        type="text"
                        placeholder="Group"
                        value={groupAccessor()}
                        class="input"
                        onInput={e => groupSetter(e.currentTarget.value)}
                    />
                </Show>
            </label>
        </>
    );
};
