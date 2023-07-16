import { type Component, Show, For, createSignal } from "solid-js";
import "../index.css";
import { config, saveConfig } from "..";
import { invoke } from "@tauri-apps/api/tauri";

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
    const runningTauri = window.__TAURI_IPC__ != null;
    const [modifiers, setModifiers] = createSignal(0);
    const [keyCode, setKeyCode] = createSignal("");
    const [desktopConfig, setDesktopConfig] = createSignal<DesktopConfig>(null);
    console.log(runningTauri);
    if (runningTauri) {
        invoke<DesktopConfig>("get_config").then(config => {
            console.log(config);
            setDesktopConfig(config);
            setModifiers(config.modifiers.bits);
            setKeyCode(config.code);
        });
    }

    return (
        <>
            <div class="content-header">
                <h2>Settings</h2>
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
            </div>
        </>
    );
};

export default SettingsPage;