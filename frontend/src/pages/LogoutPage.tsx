import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const LogoutPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    return (
        <>
            <h1>Are you sure?</h1>
            {error() == "" ? <></> : <p>{error()}</p>}
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
        </>
    );
};

export default LogoutPage;
