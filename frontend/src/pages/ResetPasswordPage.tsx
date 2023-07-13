import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";

const ResetPasswordPage: Component = () => {
    const [error, setError] = createSignal("");
    const [oldPassword, setOldPassword] = createSignal("");
    const [newPassword, setNewPassword] = createSignal("");
    return (
        <>
            <h1>Password Reset</h1>
            {error() == "" ? <></> : <p>{error()}</p>}
            <h2>Old Password</h2>
            <input
                type="password"
                value={oldPassword()}
                onInput={e => {
                    setOldPassword(e.currentTarget.value);
                }}
            />
            <h2>New Password</h2>
            <input
                type="password"
                value={newPassword()}
                onInput={e => {
                    setNewPassword(e.currentTarget.value);
                }}
            />
            <p>Don't use a password you use elsewhere :)</p>
            <br />
            <button
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
        </>
    );
};

export default ResetPasswordPage;
