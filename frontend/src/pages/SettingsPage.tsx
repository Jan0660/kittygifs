import { type Component, Show, For, createSignal, createEffect } from "solid-js";
import "../index.css";
import { client, config, getErrorString, saveConfig, saveSettings, settings, userInfo } from "..";
import { invoke } from "@tauri-apps/api/tauri";
import { GroupSelect } from "../components/GroupSelect";
import { useNavigate } from "@solidjs/router";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import HCaptcha from "solid-hcaptcha";
import { InstanceInfo } from "../client/Client";

const ModifierKeys = {
    Alt: 0x01,
    AltGraph: 0x02,
    CapsLock: 0x04,
    Control: 0x08,
    Fn: 0x10,
    FnLock: 0x20,
    Meta: 0x40,
    NumLock: 0x80,
    ScrollLock: 0x100,
    Shift: 0x200,
    // Symbol: 0x400,
    // SymbolLock: 0x800,
    // Hyper: 0x1000,
    // Super: 0x2000,
};

const KeyCodes = (() => {
    let res = ["Space", "Backquote"];
    for (let i = 65; i <= 90; i++) {
        res.push("Key" + String.fromCharCode(i));
    }
    // digits
    for (let i = 0; i <= 9; i++) {
        res.push("Digit" + i);
    }
    // numpad digits
    for (let i = 0; i <= 0; i++) {
        res.push("Numpad" + i);
    }
    // F keys
    for (let i = 1; i <= 12; i++) {
        res.push("F" + i);
    }
    return res;
})();

type DesktopConfig = {
    modifiers: {
        bits: number;
    };
    code: string;
};

const SettingsPage: Component = () => {
    const navigate = useNavigate();
    const runningTauri = window.__TAURI_IPC__ != null;
    const [modifiers, setModifiers] = createSignal(0);
    const [keyCode, setKeyCode] = createSignal("");
    const [startupEnabled, setStartupEnabled] = createSignal(null);
    const [desktopConfig, setDesktopConfig] = createSignal<DesktopConfig>(null);
    console.log(runningTauri);
    if (runningTauri) {
        invoke<DesktopConfig>("get_config").then(config => {
            console.log(config);
            setDesktopConfig(config);
            setModifiers(config.modifiers.bits);
            setKeyCode(config.code);
        });
        isEnabled().then(res => {
            setStartupEnabled(res);
        })
    }
    const [defaultGroup, setDefaultGroup] = createSignal(settings.data.defaultGroup ?? "none");
    createEffect(() => {
        settings.data.defaultGroup = defaultGroup() == "none" ? null : defaultGroup();
        saveSettings();
    });
    const [changeEmail, setChangeEmail] = createSignal("");
    const [changeEmailError, setChangeEmailError] = createSignal("");
    const [changeEmailPassword, setChangeEmailPassword] = createSignal("");
    const [changeEmailCaptcha, setChangeEmailCaptcha] = createSignal(null as string | null);
    const [instanceInfo, setInstanceInfo] = createSignal(null as InstanceInfo | null);
    client.getInstanceInfo().then(setInstanceInfo);

    return (
        <>
            <div class="content-header">
                <h1>Settings</h1>
            </div>
            <div class="content-content">
                <h3>Appearance</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.data.searchHighlight}
                        onChange={() => {
                            settings.data.searchHighlight = !settings.data.searchHighlight;
                            saveSettings();
                        }}
                    />{" "}
                    Show Search Highlight
                </label>
                <h3>Other</h3>
                <label>Query Prepend - Prepended to every search behind the scenes.</label> <br />
                <input
                    type="text"
                    value={settings.data.queryPrepend ?? ""}
                    onChange={e => {
                        e.target.value = e.target.value.toLocaleLowerCase().trimStart();
                        settings.data.queryPrepend = e.target.value;
                        saveSettings();
                    }}
                    class="input"
                />
                <br />
                <label>Default Group for Posting</label> <br />
                {/* <input
                    type="text"
                    value={settings.data.defaultGroup ?? ""}
                    onChange={e => {
                        e.target.value = e.target.value.toLocaleLowerCase().trim();
                        settings.data.defaultGroup = e.target.value == "" ? null : e.target.value;
                        saveSettings();
                    }}
                    class="input"
                /> */}
                <GroupSelect groupAccessor={defaultGroup} groupSetter={setDefaultGroup} />
                <br />
                <label>Gifs Limit</label><br/>
                <input class="input" type="number" value={settings.data.limit} onChange={(e) => {
                    settings.data.limit = parseInt(e.target.value);
                    saveSettings();
                }}/>
                <Show when={runningTauri && desktopConfig() != null}>
                    <h3>Desktop Settings</h3>
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.data.searchHighlightInPopup}
                            onChange={() => {
                                settings.data.searchHighlightInPopup = !settings.data.searchHighlightInPopup;
                                saveSettings();
                            }}
                        />{" "}
                        Show Search Highlight in Popup
                    </label>
                    <br />
                    <Show when={startupEnabled() != null} fallback={<b>Loading Autostart Options...</b>}>
                        <label>
                            <input
                                type="checkbox"
                                checked={startupEnabled()}
                                onChange={async e => {
                                    if (e.target.checked) {
                                        await enable();
                                    } else {
                                        await disable();
                                    }
                                    setStartupEnabled(e.target.checked);
                                }}
                            />{" "}
                            Run on Startup
                        </label>
                    </Show>
                    <br />
                    <h4>Shortcut to Show Popup</h4>
                    Modifiers:
                    <br />
                    <For each={Object.keys(ModifierKeys)}>
                        {(key, _) => (
                            <>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={(modifiers() & ModifierKeys[key]) != 0}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setModifiers(modifiers() | ModifierKeys[key]);
                                            } else {
                                                setModifiers(modifiers() & ~ModifierKeys[key]);
                                            }
                                        }}
                                    />{" "}
                                    {key == "Meta" ? "Meta (Windows key)" : key}
                                </label>
                                <br />
                            </>
                        )}
                    </For>
                    <label for="keycodes">Key: </label>
                    <select
                        id="keycodes"
                        onChange={e => {
                            setKeyCode(e.target.value);
                        }}
                    >
                        <For each={KeyCodes}>
                            {(code, _) => (
                                <>
                                    <option value={code} selected={keyCode() == code}>
                                        {code}
                                    </option>
                                </>
                            )}
                        </For>
                    </select>
                    <br />
                    <button
                        class="button primary"
                        onclick={() => {
                            invoke("set_hotkey", {
                                modifiers: modifiers(),
                                code: keyCode(),
                            });
                        }}
                    >
                        Save Shortcut
                    </button>
                    * You currently have to restart the app for the shortcut to take effect.
                </Show>
                <Show when={config.token != null}>
                    <h3>Account</h3>
                    <Show when={userInfo.getStore()?.username}>
                        <p>Logged in as {userInfo.getStore()?.username}</p>
                    </Show>
                    <h4>Change Email</h4>
                    <div class="error">{changeEmailError() == "" ? <></> : <p>{changeEmailError()}</p>}</div>
                    <input
                        type="text"
                        value={changeEmail()}
                        onChange={e => {
                            setChangeEmail(e.target.value);
                        }
                        }
                        placeholder="New Email"
                        class="input"
                    />
                    <br />
                    <input
                        type="password"
                        value={changeEmailPassword()}
                        onChange={e => {
                            setChangeEmailPassword(e.target.value);
                        }
                        }
                        placeholder="Password"
                        class="input"
                    />
                    <br />
                    <Show when={instanceInfo()?.captcha != null}>
                        <HCaptcha
                            sitekey={instanceInfo().captcha.siteKey}
                            onVerify={token => {
                                setChangeEmailCaptcha(token);
                            }}
                            onChallengeExpired={() => {
                                setChangeEmailCaptcha(null);
                            }}
                        />
                    </Show>
                    <button
                        class="button primary"
                        onclick={async () => {
                            setChangeEmailError("");
                            try {
                                await client.users.changeEmail({
                                    email: changeEmail(),
                                    password: changeEmailPassword(),
                                    captcha: changeEmailCaptcha(),
                                });
                                setChangeEmailError("Email changed requested successfully. Please check your inbox and spam folder for a confirmation link.");
                            } catch (e) {
                                setChangeEmailError(getErrorString(e));
                            }
                        }
                        }
                        disabled={!(changeEmail() != "" && changeEmailPassword() != "" && (changeEmailCaptcha() != null || instanceInfo()?.captcha == null))}
                    >Change Email</button>
                    <br />
                    <button
                        class="button danger"
                        onclick={() => {
                            navigate("/settings/accountDeletion");
                        }}
                    >Request Account Deletion or Other GDPR Request</button>
                    <h3>Setting Sync</h3>
                    <label>
                        <input
                            type="checkbox"
                            checked={config.enableSync}
                            onChange={() => {
                                config.enableSync = !config.enableSync;
                                saveConfig();
                            }}
                        />{" "}
                        Enable Settings Sync (locally)
                    </label>
                    <br />
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.data.enableSyncByDefault}
                            onChange={() => {
                                settings.data.enableSyncByDefault = !settings.data.enableSyncByDefault;
                                saveSettings();
                            }}
                        />{" "}
                        Enable Settings Sync by Default on New Logins
                    </label>
                </Show>
                <h3>Pro Stuff 😎</h3>
                <label>API URL</label> <br />
                <input
                    type="text"
                    value={config.apiUrl}
                    onChange={e => {
                        config.apiUrl = e.target.value;
                        saveConfig();
                    }}
                    placeholder="http(s)://host:port"
                    class="input"
                    style="width: 50%;"
                />
                <br />
                <label>
                    <input
                        type="checkbox"
                        checked={settings.data.groupTextInput}
                        onChange={e => {
                            settings.data.groupTextInput = e.target.checked;
                            saveSettings();
                        }}
                    />
                    Use a text input for group selection instead of a dropdown
                </label>
            </div>
        </>
    );
};

export default SettingsPage;
