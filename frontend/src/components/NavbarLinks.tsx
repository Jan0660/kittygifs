import { Component, Show } from "solid-js";
import { config, notificationStore, instanceInfo } from "..";
import { A } from "@solidjs/router";

export default function NavbarLinks() {
    return (
        <ul class="navbar-links">
            <li>
                <Show when={config.token == null}>
                    <Show
                        when={instanceInfo.getStore().logto}
                        fallback={
                            <>
                                <A href="/login" class="button">
                                    Login
                                </A>{" "}
                                <Show when={instanceInfo.getStore().allowSignup}>
                                    or{" "}
                                    <A href="/signup" class="button">
                                        Signup
                                    </A>
                                </Show>
                            </>
                        }
                    >
                        <A href="/logto" class="button">
                            {instanceInfo.getStore().allowSignup ? "Login/Signup" : "Login"}
                        </A>
                    </Show>
                </Show>
                <Show when={config.token != null}>
                    <Show when={notificationStore.getStore()}>
                        <A href="/notifications" class="button">
                            Notifications ({notificationStore.getStore()})
                        </A>
                    </Show>
                    <A href="/gifs/post" class="button">
                        Post
                    </A>
                    <A href="/resetPassword" class="button">
                        Reset Password
                    </A>
                    <A href="/logout" class="button">
                        Log out
                    </A>
                </Show>
                <A href="/settings" class="button">
                    Settings
                </A>
                <A href="/tags" class="button">
                    Tags
                </A>
                <Show when={config.token != null}>
                    <br />
                </Show>
            </li>
        </ul>
    );
}
