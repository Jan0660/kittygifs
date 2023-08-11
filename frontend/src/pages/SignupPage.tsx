import { Component, Show, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";
import { useNavigate } from "@solidjs/router";
import { InstanceInfo } from "../client/Client";
import HCaptcha from "solid-hcaptcha";

const SignupPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [passwordConfirm, setPasswordConfirm] = createSignal("");
    const [consent, setConsent] = createSignal(false);
    const [email, setEmail] = createSignal("");
    const [instanceInfo, setInstanceInfo] = createSignal(null as InstanceInfo | null);
    client.getInstanceInfo().then(setInstanceInfo);
    const [captcha, setCaptcha] = createSignal(null as string | null);
    return (
        <>
            <div class="content-header">
                <h1>Signup</h1>
            </div>
            <div class="content-content">
                <Show when={instanceInfo() === null}>
                    <p>Checking signup requirements...</p>
                </Show>
                <Show when={instanceInfo() !== null && !instanceInfo()?.allowSignup}>
                    <p>Signup is disabled on this instance.</p>
                </Show>
                <Show when={instanceInfo() !== null && instanceInfo()?.allowSignup}>
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
                <Show when={instanceInfo()?.captcha != null}>
                    <HCaptcha
                        sitekey={instanceInfo().captcha.siteKey}
                        onVerify={token => {
                            setCaptcha(token);
                        }}
                    />
                </Show>
                <button
                    class="button confirm"
                    onClick={async () => {
                        try {
                            if (password() != passwordConfirm()) {
                                setError("Passwords do not match!");
                                return;
                            }
                            const session = await client.createUser(username(), password(), captcha());
                            config.token = session.token;
                            await saveConfig();
                            window.location.href = "/";
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                    disabled={!(consent() && (captcha() != null || instanceInfo()?.captcha == null))}
                >
                    Sign up
                </button>
                </Show>
            </div>
        </>
    );
};

export default SignupPage;
