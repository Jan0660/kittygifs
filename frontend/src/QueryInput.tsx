import { Component, Setter } from "solid-js";
import { client } from "./index";
import { Gif } from "./client/Client";

type Props = {
    setGifs: Setter<Gif[]>;
};

const QueryInput: Component<Props> = (props: Props) => {
    let abortLast: AbortController | null = null;
    return (
        <>
            <input
                id="queryInput"
                maxLength={256}
                autofocus
                type="text"
                onInput={e => {
                    if (abortLast) {
                        abortLast.abort();
                    }
                    abortLast = new AbortController();
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
