import { Component, For, Show, createSignal } from "solid-js";
import { client, config, deleteUserInfo, getErrorString, saveConfig } from "..";
import { useNavigate } from "@solidjs/router";
import { Notification } from "../client/Client";

function NotificationToString(notif: Notification): string {
    switch (notif.data.type) {
        case "gdprRequest": {
            return `New GDPR request by @${notif.data.username}`
        }
    }
}

const NotificationsPage: Component = () => {
    const [notifications, setNotifications] = createSignal(null as Notification[] | null, { equals: false });
    client.getNotifications().then(notifs => {
        console.log(notifs)
        setNotifications(notifs);
    });
    return (
        <>
            <div class="content-header">
                <h1>Notifications</h1>
            </div>
            <div class="content-content">
                <Show when={notifications() === null}>
                    <h2>Loading...</h2>
                </Show>
                <Show when={notifications()?.length === 0}>
                    <h2>No notifications.</h2>
                </Show>
                <Show when={notifications() !== null && notifications().length !== 0}>
                    <For each={notifications()}>
                        {(notif, index) => (
                            <div>
                                <h3><a onclick={async () => {
                                    await client.deleteNotification(notif.id);
                                    notifications().splice(index(), 1)
                                    setNotifications(notifications())
                                }} style="cursor: pointer">X</a> {NotificationToString(notif)}</h3>
                            </div>
                        )}
                    </For>
                </Show>
            </div>
        </>
    );
};

export default NotificationsPage;
