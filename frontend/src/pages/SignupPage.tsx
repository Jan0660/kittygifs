import { Component, Show, createSignal } from "solid-js";
import { client, config, getErrorString, instanceInfo, saveConfig } from "..";
import { InstanceInfo } from "../client/Client";
import HCaptcha from "solid-hcaptcha";
import { A } from "@solidjs/router";

const SignupPage: Component = () => {
    const [error, setError] = createSignal("");
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [passwordConfirm, setPasswordConfirm] = createSignal("");
    const [consent, setConsent] = createSignal(false);
    instanceInfo.getSave(true);
    const [captcha, setCaptcha] = createSignal(null as string | null);
    return (
        <>
            <div class="content-header">
                <h1>Signup</h1>
            </div>
            <div class="content-content">
                <Show when={instanceInfo.getStore() === null}>
                    <p>Checking signup requirements...</p>
                </Show>
                <Show when={instanceInfo.getStore() !== null && !instanceInfo.getStore()?.allowSignup}>
                    <p>Signup is disabled by the site's administrator.</p>
                </Show>
                <Show when={instanceInfo.getStore() !== null && instanceInfo.getStore()?.allowSignup && !instanceInfo.getStore().logto?.allowLegacySignup}>
                    <p>Signup using username and password is disabled by the site's administrator. <A href="/logto" class="link">Sign up using Logto instead.</A></p>
                </Show>
                <Show when={instanceInfo.getStore() !== null && instanceInfo.getStore()?.allowSignup}>
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
                <Show when={instanceInfo.getStore()?.captcha != null}>
                    <HCaptcha
                        sitekey={instanceInfo.getStore().captcha.siteKey}
                        onVerify={token => {
                            setCaptcha(token);
                        }}
                        onChallengeExpired={() => {
                            setCaptcha(null);
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
                            const result = await client.users.post(username(), password(), captcha());
                            if (result.type == "created") {
                                config.token = result.session.token;
                                await saveConfig();
                                window.location.href = "/";
                            }
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                    disabled={!(consent() && (captcha() != null || instanceInfo.getStore()?.captcha == null))}
                >
                    Sign up
                </button>
                </Show>
            </div>
        </>
    );
};

export default SignupPage;
