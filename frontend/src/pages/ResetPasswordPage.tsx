import { Component, createSignal } from "solid-js";
import { client, config, getErrorString, saveConfig } from "..";
import toast from "solid-toast";

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
                <div class="info">
                    <p>
                        Resetting your password does <b>not</b> sign out your other sessions. To do so, click on the following button:
                        <button onClick={async () => {
                            toast.promise(client.users.sessions.deleteAllOtherSessions(), {
                                loading: "Signing out other sessions...",
                                success: "Signed out other sessions",
                                error: (e: Error) => getErrorString(e),
                            });
                        }}
                            class="button danger">Sign out all my other sessions</button>
                    </p>
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
                        toast.promise(client.users.resetPassword(oldPassword(), newPassword()), {
                            loading: "Resetting password...",
                            success: "Password reset",
                            error: (e: Error) => getErrorString(e),
                        });
                    }}
                >
                    Reset Password
                </button>
            </div>
        </>
    );
};

export default ResetPasswordPage;
