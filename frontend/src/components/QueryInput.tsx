import { Accessor, Component, Setter, onMount } from "solid-js";
import { client, config, settings } from "../index";
import { appWindow } from '@tauri-apps/plugin-window';
import { Gif } from "../client/Client";

type Props = {
    setGifs: Setter<Gif[]>;
    query: Accessor<string>;
    setQuery: Setter<string>;
};

const QueryInput: Component<Props> = (props: Props) => {
    const runningTauri = window.__TAURI_IPC__ != null;
    let abortLast: AbortController | null = null;
    if (!(runningTauri && appWindow.isVisible())) {
        onMount(() => {
            abortLast = new AbortController();
            client.searchGifs(settings.data.queryPrepend + " " + props.query(), abortLast.signal, {
                max: settings.data.limit,
            }).then(res => {
                props.setGifs(res);
            }).catch(e => {
                if (e.name != "CanceledError") {
                    console.error(e);
                }
            });
        });
    }
    if (runningTauri) {
        appWindow.listen("tauri://resize", event => {
            // @ts-ignore
            if (event.payload.height === 0 && event.payload.width === 0) {
                props.setQuery("");
                props.setGifs([]);
            }
        });
        appWindow.listen("tauri://close-requested", event => {
            props.setQuery("");
            props.setGifs([]);
        })
    }
    return (
        <>
            <input
                class="input"
                id="queryInput"
                maxLength={256}
                autofocus
                type="text"
                placeholder="Search for gifs.."
                value={props.query()}
                onInput={e => {
                    if (abortLast) {
                        abortLast.abort();
                    }
                    abortLast = new AbortController();
                    e.currentTarget.value = e.currentTarget.value.toLocaleLowerCase().trimStart();
                    props.setQuery(e.currentTarget.value);
                    let query = e.currentTarget.value;
                    if (settings.data.queryPrepend) {
                        query = settings.data.queryPrepend + " " + query;
                    }
                    client.searchGifs(query, abortLast.signal, {
                        max: settings.data.limit,
                    }).then(res => {
                        console.log(res);
                        props.setGifs(res);
                    }).catch(e => {
                        if (e.name != "CanceledError") {
                            console.error(e);
                        }
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
