import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const SignupPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [passwordConfirm, setPasswordConfirm] = createSignal("");
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

            <p>Don't use a password you use elsewhere :)</p>
            <h2>Confirm Password</h2>
            <input
                type="password"
                value={passwordConfirm()}
                onInput={e => {
                    setPasswordConfirm(e.currentTarget.value);
                }}
            />
            <br />
            <button
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
                Login
            </button>
        </>
    );
};

export default SignupPage;
