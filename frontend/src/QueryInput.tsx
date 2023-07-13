import { Component, Setter, onMount } from "solid-js";
import { client } from "./index";
import { Gif } from "./client/Client";

type Props = {
    setGifs: Setter<Gif[]>;
    setQuery: Setter<string>;
};

const QueryInput: Component<Props> = (props: Props) => {
    let abortLast: AbortController | null = null;
    onMount(() => {
        client.searchGifs('').then(res => {
            props.setGifs(res);
        });
    })
    return (
        <>
            <input
                class="input"
                id="queryInput"
                maxLength={256}
                autofocus
                type="text"
                placeholder="Search for gifs.."
                onInput={e => {
                    if (abortLast) {
                        abortLast.abort();
                    }
                    abortLast = new AbortController();
                    props.setQuery(e.currentTarget.value)
                    client.searchGifs(e.currentTarget.value, abortLast.signal).then(res => {
                        console.log(res);
                        props.setGifs(res);
                    });
                }}
            />
        </>
    );
};

export default QueryInput;
