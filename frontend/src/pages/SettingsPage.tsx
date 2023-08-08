import { type Component, Show, For, createSignal } from "solid-js";
import "../index.css";
import { config, saveConfig } from "..";
import { invoke } from "@tauri-apps/api/tauri";
import { GroupSelect } from "../components/GroupSelect";
import { useNavigate } from "@solidjs/router";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

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
                        checked={config.searchHighlight}
                        onChange={() => {
                            config.searchHighlight = !config.searchHighlight;
                            saveConfig();
                        }}
                    />{" "}
                    Show Search Highlight
                </label>
                <h3>Other</h3>
                <label>Query Prepend - Prepended to every search behind the scenes.</label> <br />
                <input
                    type="text"
                    value={config.queryPrepend ?? ""}
                    onChange={e => {
                        e.target.value = e.target.value.toLocaleLowerCase().trimStart();
                        config.queryPrepend = e.target.value;
                        saveConfig();
                    }}
                    class="input"
                />
                <br />
                <label>Default Group for Posting</label> <br />
                <input
                    type="text"
                    value={config.defaultGroup ?? ""}
                    onChange={e => {
                        e.target.value = e.target.value.toLocaleLowerCase().trim();
                        config.defaultGroup = e.target.value == "" ? null : e.target.value;
                        saveConfig();
                    }}
                    class="input"
                />
                <br />
                <label>Gifs Limit</label><br/>
                <input class="input" type="number" value={config.limit} onChange={(e) => {
                    config.limit = parseInt(e.target.value);
                    saveConfig();
                }}/>
                <Show when={runningTauri && desktopConfig() != null}>
                    <h3>Desktop Settings</h3>
                    <label>
                        <input
                            type="checkbox"
                            checked={config.searchHighlightInPopup}
                            onChange={() => {
                                config.searchHighlightInPopup = !config.searchHighlightInPopup;
                                saveConfig();
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
                />
                <br />
                <label>
                    <input
                        type="checkbox"
                        checked={config.groupTextInput}
                        onChange={e => {
                            config.groupTextInput = e.target.checked;
                            saveConfig();
                        }}
                    />
                    Use a text input for group selection instead of a dropdown
                </label>
                <br />
                <br />
                <button
                    class="button danger"
                    onclick={() => {
                        navigate("/settings/accountDeletion");
                    }}
                >Request Account Deletion or Other GDPR Request</button>
            </div>
        </>
    );
};

export default SettingsPage;
