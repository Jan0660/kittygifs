import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig, settings, initClient, loginWithToken } from "..";
import { useNavigate } from "@solidjs/router";

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
                    class="button confirm"
                    onClick={async () => {
                        try {
                            const token = await client.users.sessions.post(username(), password());
                            await loginWithToken(token);
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
