import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const LoginPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    return (
        <>
            <div class="content-header">
                <h1>Login</h1>
            </div>
            <div class="content-content">
                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <h3>Username</h3>
                <input
                    type="text"
                    value={username()}
                    class="input"
                    onInput={e => {
                        setUsername(e.currentTarget.value);
                    }}
                    required
                />
                <h3>Password</h3>
                <input
                    type="password"
                    value={password()}
                    class="input"
                    onInput={e => {
                        setPassword(e.currentTarget.value);
                    }}
                    required
                />
                <br />
                <button
                    class="button"
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
            </div>
        </>
    );
};

export default LoginPage;
