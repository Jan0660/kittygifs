import { Component, createSignal, Show } from "solid-js";
import { client, config, userInfo, getErrorString, notificationStore, saveConfig, loginWithToken } from "..";
import { useNavigate, useSearchParams } from "@solidjs/router";
import localforage from "localforage";

const LogtoPage: Component = () => {
    const [searchParams, _] = useSearchParams();
    const [username, setUsername] = createSignal("");
    const [error, setError] = createSignal("");
    const [consent, setConsent] = createSignal(false);
    if (searchParams["token"]) {
        client.logto.getSessionToken(searchParams["token"]).then(token => loginWithToken(token).catch(e => setError(getErrorString(e)))).catch(e => setError(getErrorString(e)));
    }
    let linking = false;
    if (searchParams["logtoFirstId"] && config.token) {
        linking = true;
        client.logto.link(searchParams["logtoFirstId"]).then(() => document.location.href = "/");
    }
    return (
        <>
            <div class="content-header">
                <h1>Login/Signup via Logto</h1>
            </div>
            <div class="content-content">
                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <br />
                <Show when={!searchParams["token"] && !searchParams["logtoFirstId"]}>
                    <button
                        class="button confirm"
                        onClick={async () => {
                            window.location.href = config.apiUrl + "/logto/sign-in?return=" + encodeURIComponent(window.location.href);
                        }}
                    >
                        {config.token ? "Link this account with Logto" : "Login/Signup"}
                    </button>
                </Show>
                <Show when={searchParams["token"] && !searchParams["logtoFirstId"]}>
                    <p>Please wait...</p>
                </Show>
                <Show when={!searchParams["token"] && searchParams["logtoFirstId"]}>
                    <Show when={!linking} fallback={<p>Please wait...</p>}>
                        <h2>Username</h2>
                        <input
                            type="text"
                            value={username()}
                            onInput={e => {
                                setUsername(e.currentTarget.value);
                            }}
                            class="input"
                        />
                        <br />
                        <label>
                            <input
                                type="checkbox"
                                checked={consent()}
                                onInput={e => {
                                    setConsent(e.currentTarget.checked);
                                }}
                            />
                            I consent to the{" "}
                            <a class="link" href="/legal/terms">
                                terms of service
                            </a>{" "}
                            and{" "}
                            <a class="link" href="/legal/privacy">
                                privacy policy
                            </a>
                            .
                        </label>
                        <br />
                        <button
                            class="button confirm"
                            disabled={!consent()}
                            onClick={async () => {
                                const session = await client.logto.registerAccount({ logtoFirstId: searchParams["logtoFirstId"], username: username() })
                                await loginWithToken(session.token);
                            }}
                        >
                            Sign up
                        </button>
                    </Show>
                </Show>
            </div>
        </>
    );
};

export default LogtoPage;
