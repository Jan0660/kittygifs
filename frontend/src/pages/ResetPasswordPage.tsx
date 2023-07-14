import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const ResetPasswordPage: Component = () => {
    const [error, setError] = createSignal("");
    const [oldPassword, setOldPassword] = createSignal("");
    const [newPassword, setNewPassword] = createSignal("");
    return (
        <>
            <div class="content-header">
                <h1>Password Reset</h1>
            </div>
            <div class="content-content">
                <div class="error">
                    {error() == "" ? <></> : <p>{error()}</p>}
                </div>
                <h2>Old Password</h2>
                <input
                    type="password"
                    value={oldPassword()}
                    class="input"
                    onInput={e => {
                        setOldPassword(e.currentTarget.value);
                    }}
                />
                <h2>New Password</h2>
                <input
                    type="password"
                    value={newPassword()}
                    class="input"
                    onInput={e => {
                        setNewPassword(e.currentTarget.value);
                    }}
                />
                <p>Don't use a password you use elsewhere :)</p>
                <br />
                <button
                    class="button"
                    onClick={async () => {
                        try {
                            await client.resetPassword(oldPassword(), newPassword());
                        } catch (e) {
                            setError(getErrorString(e));
                        }
                    }}
                >
                    Reset Password
                </button>
            </div>
        </>
    );
};

export default ResetPasswordPage;
