import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const LoginPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    return (
        <>
            <h1>Login</h1>
            {error() == "" ? <></> : <p>{error()}</p>}
            <h2>Username</h2>
            <input
                type="text"
                value={username()}
                onInput={e => {
                    setUsername(e.currentTarget.value);
                }}
            />
            <h2>Password</h2>
            <input
                type="password"
                value={password()}
                onInput={e => {
                    setPassword(e.currentTarget.value);
                }}
            />
            <br />
            <button
                onClick={async () => {
                    try {
                        const token = await client.createSession(username(), password());
                        config.token = token;
                        await saveConfig();
                        window.location.href = "/";
                    } catch (e) {
                        setError(getErrorString(e));
                    }
                }}
            >
                Login
            </button>
        </>
    );
};

export default LoginPage;
