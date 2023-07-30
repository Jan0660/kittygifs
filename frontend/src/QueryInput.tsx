import { Component, Setter, onMount } from "solid-js";
import { client, config } from "./index";
import { Gif } from "./client/Client";

type Props = {
    setGifs: Setter<Gif[]>;
    setQuery: Setter<string>;
};

const QueryInput: Component<Props> = (props: Props) => {
    let abortLast: AbortController | null = null;
    onMount(() => {
        client.searchGifs(config.queryPrepend ?? "", null, {
            max: config.limit,
        }).then(res => {
            props.setGifs(res);
        });
    });
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
                    e.currentTarget.value = e.currentTarget.value.toLocaleLowerCase().trimStart();
                    props.setQuery(e.currentTarget.value);
                    let query = e.currentTarget.value;
                    if (config.queryPrepend) {
                        query = config.queryPrepend + " " + query;
                    }
                    client.searchGifs(query, abortLast.signal, {
                        max: config.limit,
                    }).then(res => {
                        console.log(res);
                        props.setGifs(res);
                    });
                }}
            />

            <a
                href="https://github.com/Jan0660/kittygifs/blob/main/docs/api.md#searching"
                target="_blank"
                rel="noreferrer"
                tabindex={-1}
                class="link"
            >
                ???
            </a>
        </>
    );
};

export default QueryInput;
