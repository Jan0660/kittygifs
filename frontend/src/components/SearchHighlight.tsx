import { For, Show } from "solid-js";
import { Gif } from "../client/Client";

export const SearchHighlight = ({ gif, query }: { gif: Gif, query: string }) => {
    return (
        <For each={gif.tags}>
            {(tag, i) => {
                //SEARCH HIGHLIGHTING
                //First see if the search is present in the tag
                const search = tag.match(query)
                if (!search) { //If not then dont return it
                    return (<></>
                    )
                }
                //If so then split it into parts. (Could be multiple parts matching the query!)
                const parts = tag.split(search[0])
                    .reduce((list, elem, i) => {
                        list.push(elem);
                        if (i == list.length - 1)
                            list.push(search[0]);
                        return list;
                    }, []);
                console.log(parts)
                return (
                    <span class="tag">
                        <For each={parts}>
                            {(part, i) => (
                                <span>
                                    <Show when={part == search}>
                                        <span style="background-color: rgba(255, 255, 0, 0.5)">
                                            {part}
                                        </span>
                                    </Show>
                                    <Show when={part != search}>
                                        {part}
                                    </Show>
                                </span>
                            )}
                        </For>
                    </span>
                )
            }
            }
        </For>
    )
}