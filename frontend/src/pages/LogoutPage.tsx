import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const LogoutPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    return (
        <>
            <div class="content-header">
                <h1>Are you sure you want to log out?</h1>
            </div>
            <div class="content-content">
                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <br />
                <button
                    onClick={async () => {
                        try {
                            await client.deleteSession(config.token);
                            config.token = null;
                            await saveConfig();
                            window.location.href = "/";
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                >
                    Log out
                </button>
            </div>
        </>
    );
};

export default LogoutPage;
