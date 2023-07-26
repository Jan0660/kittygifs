import { Show, createSignal } from "solid-js";
import "../../index.css";
import SolidMarkdown from "solid-markdown";

const LegalMarkdownPage = (props: { path: string; title: string }) => {
    const [markdown, setMarkdown] = createSignal("");
    fetch(props.path).then(res => {
        res.text().then(text => {
            // slice off the first line (the title)
            setMarkdown(text.slice(text.indexOf("\n") + 1));
        });
    });

    return (
        <>
            <div class="content-header">
                <h1>{props.title}</h1>
            </div>
            <div class="content-content">
                <Show when={markdown()} fallback={<h2>Loading...</h2>}>
                    <SolidMarkdown children={markdown()} />
                </Show>
            </div>
        </>
    );
};

export default LegalMarkdownPage;
