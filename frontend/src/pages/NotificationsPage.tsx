import { Component, For, Show, createSignal } from "solid-js";
import { client, setNotificationCount } from "..";
import { A } from "@solidjs/router";
import { Notification, isDeletableNotification } from "../client/Client";

function NotificationToString(notif: Notification): string {
    switch (notif.data.type) {
        case "gdprRequest": {
            return `New GDPR request by @${notif.data.username}`;
        }
        case "gifEditSuggestion": {
            return `Gif edit suggestion by @${notif.data.username}`;
        }
        default: {
            // @ts-ignore
            return `Unknown notification type ${notif.data.type}`;
        }
    }
}

function GetNotificationLink(notif: Notification): string | null {
    switch (notif.data.type) {
        case "gifEditSuggestion": {
            return `/gifs/${notif.data.gifId}/edit?gifEditSuggestion=${notif.eventId}`;
        }
        default: {
            return null;
        }
    }
}

const NotificationsPage: Component = () => {
    const [notifications, setNotifications] = createSignal(null as Notification[] | null, {
        equals: false,
    });
    client.getNotifications().then(notifs => {
        console.log(notifs);
        setNotifications(notifs);
        setNotificationCount(notifs.length);
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
                        {(notif, index) => {
                            const link = GetNotificationLink(notif);
                            return (
                                <div>
                                    <h3>
                                        <Show when={isDeletableNotification(notif)}>
                                            <a
                                                onclick={async () => {
                                                    await client.deleteNotification(notif.id);
                                                    notifications().splice(index(), 1);
                                                    setNotifications(notifications());
                                                }}
                                                style="cursor: pointer"
                                            >
                                                X
                                            </a>{" "}
                                        </Show>
                                        {link === null ? NotificationToString(notif) : <A class="link" href={link}>
                                            {NotificationToString(notif)}
                                            </A>}
                                    </h3>
                                </div>
                            );
                        }}
                    </For>
                </Show>
            </div>
        </>
    );
};

export default NotificationsPage;
