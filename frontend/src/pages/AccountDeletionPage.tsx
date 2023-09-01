import { type Component, Show, For, createSignal } from "solid-js";
import "../index.css";
import { client, config, getErrorString, saveConfig } from "..";
import { useNavigate } from "@solidjs/router";

const AccountDeletionPage: Component = () => {
    const [error, setError] = createSignal("");
    const navigate = useNavigate();
    const [password, setPassword] = createSignal("");
    const [isDeletion, setIsDeletion] = createSignal(true);
    const [keepPosts, setKeepPosts] = createSignal(true);
    const [note, setNote] = createSignal("");

    return (
        <>
            <div class="content-header">
                <h1>Request Account Deletion or Other GDPR Request</h1>
            </div>
            <div class="content-content">
                <div class="error">{error() == "" ? <></> : <p>{error()}</p>}</div>
                <input
                    type="password"
                    placeholder="Password"
                    value={password()}
                    class="input"
                    onInput={e => setPassword(e.currentTarget.value)}
                />
                <br/>
                <label>
                    <input
                        type="checkbox"
                        checked={isDeletion()}
                        onChange={() => setIsDeletion(!isDeletion())}
                    />{" "}
                    This is a request for account deletion (otherwise specify in note, including an email address to contact you at)
                </label>
                <br />
                <label>
                    <input
                        type="checkbox"
                        checked={true}
                        onChange={() => setKeepPosts(!keepPosts())}
                    />{" "}
                    Keep my posts and other contributions but anonymize them
                </label>
                <br />
                <textarea
                    placeholder="Note (max 2048 characters, optional)"
                    value={note()}
                    class="input"
                    onInput={e => setNote(e.currentTarget.value)}
                    maxlength={2048}
                />
                <br />
                <button
                    class="button danger"
                    onclick={async () => {
                        try {
                            await client.users.createGDPRRequest({
                                password: password(),
                                keepPosts: keepPosts(),
                                isDeletion: isDeletion(),
                                note: note(),
                            });
                            navigate("/settings");
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                >
                    Send
                </button>
            </div>
        </>
    );
};

export default AccountDeletionPage;
