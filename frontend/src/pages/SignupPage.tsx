import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const SignupPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [passwordConfirm, setPasswordConfirm] = createSignal("");
    return (
        <>
            <div class="content-header">
                <h1>Signup</h1>
            </div>
            <div class="content-content">
                <div class="error">{error() == "" ? <></> : <p>{error()}</p>}</div>
                <h2>Username</h2>
                <input
                    type="text"
                    value={username()}
                    onInput={e => {
                        setUsername(e.currentTarget.value);
                    }}
                    class="input"
                />
                <h2>Password</h2>
                <input
                    type="password"
                    value={password()}
                    onInput={e => {
                        setPassword(e.currentTarget.value);
                    }}
                    class="input"
                />

                <p>Don't use a password you use elsewhere :)</p>
                <h2>Confirm Password</h2>
                <input
                    type="password"
                    value={passwordConfirm()}
                    onInput={e => {
                        setPasswordConfirm(e.currentTarget.value);
                    }}
                    class="input"
                />
                <br />
                <button
                    class="button confirm"
                    onClick={async () => {
                        try {
                            if (password() != passwordConfirm()) {
                                setError("Passwords do not match!");
                                return;
                            }
                            const session = await client.createUser(username(), password());
                            config.token = session.token;
                            await saveConfig();
                            window.location.href = "/";
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                >
                    Sign up
                </button>
            </div>
        </>
    );
};

export default SignupPage;
