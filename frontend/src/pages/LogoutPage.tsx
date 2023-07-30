import { Component, createSignal } from "solid-js";
import { client, config, deleteUserInfo, getErrorString, saveConfig } from "..";
import { useNavigate } from "@solidjs/router";

const LogoutPage: Component = () => {
    const [error, setError] = createSignal("");
    return (
        <>
            <div class="content-header">
                <h1>Are you sure you want to log out?</h1>
            </div>
            <div class="content-content">
                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <br />
                <button
                    onClick={async () => {
                        try {
                            await client.deleteSession(config.token);
                            config.token = null;
                            await saveConfig();
                            await deleteUserInfo();
                            // not using navigate because it doesn't reload the page
                            window.location.href = "/";
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                    class="button confirm"
                >
                    Log out
                </button>
            </div>
        </>
    );
};

export default LogoutPage;
