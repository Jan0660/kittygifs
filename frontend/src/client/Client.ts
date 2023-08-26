import { Axios } from "axios";
import { Settings, SettingsSync } from "..";

export class KittyGifsClient {
    private _axios: Axios;

    constructor(baseUrl: string, token: string | null = null) {
        this._axios = new Axios({
            baseURL: baseUrl,
            headers: token != null ? { "x-session-token": token } : {},
            validateStatus: status => status >= 200 && status < 300,
            transformRequest: (data, headers) => {
                if (data == null) return null;
                headers["Content-Type"] = "application/json";
                return JSON.stringify(data);
            },
            transformResponse: (data, headers) => {
                if (data == null || data == "") return null;
                return JSON.parse(data);
            },
        });
    }

    public async searchGifs(query: string, signal?: AbortSignal, props?: {
        skip?: number;
        max?: number;
    }): Promise<Gif[]> {
        let url = "/gifs/search?q=" + encodeURIComponent(query);
        if (props?.skip != null) {
            url += "&skip=" + props.skip;
        }
        if (props?.max != null) {
            url += "&max=" + props.max;
        }
        let res = await this._axios.get(url, {
            signal,
        });
        return res.data;
    }

    public async getGif(id: string, signal?: AbortSignal): Promise<Gif> {
        let res = await this._axios.get("/gifs/" + encodeURIComponent(id), { signal });
        return res.data;
    }

    public async patchGif(
        id: string,
        props: {
            tags: string[];
            note: string;
            group: string | null;
        }, gifEditSuggestion?: string,
        signal?: AbortSignal,
    ): Promise<void> {
        if (props.group == "") {
            props.group = null;
        }
        let url = "/gifs/" + encodeURIComponent(id);
        if (gifEditSuggestion != null) {
            url += "?gifEditSuggestion=" + encodeURIComponent(gifEditSuggestion);
        }
        await this._axios.patch(url, props, {
            signal: signal,
        });
    }

    public async postGifEditSuggestion(id: string, props: {
        tags: string[];
        note: string;
    }): Promise<void> {
        await this._axios.post("/gifs/" + encodeURIComponent(id) + "/edit/suggestions", props);
    }

    public async postGif(
        props: {
            url: string;
            tags: string[];
            note: string;
            group: string | null;
        },
        signal?: AbortSignal,
    ): Promise<Gif> {
        const res = await this._axios.post("/gifs", props, { signal: signal });
        return res.data;
    }

    public async deleteGif(id: string, signal?: AbortSignal): Promise<Gif> {
        const res = await this._axios.delete("/gifs/" + encodeURIComponent(id), {
            signal,
        });
        return res.data;
    }

    public async createUser(
        username: string,
        password: string,
        captcha?: string,
        email?: string,
        signal?: AbortSignal,
    ): Promise<{
        type: "created",
        session: UserSession,
    } | {
        type: "verificationSent",
    }> {
        const res = await this._axios.post(
            "/users",
            { username: username, password: password, captcha: captcha, email: email },
            { signal },
        );
        return res.data;
    }

    public async createSession(
        username: string,
        password: string,
        signal?: AbortSignal,
    ): Promise<string> {
        const res = await this._axios.post(
            "/users/sessions",
            { username: username, password: password },
            { signal },
        );
        return res.data.token;
    }

    public async deleteSession(
        token: string,
        signal?: AbortSignal,
    ): Promise<void> {
        await this._axios.delete("/users/sessions/" + encodeURIComponent(token), { signal },);
    }

    public async deleteAllOtherSessions(
        signal?: AbortSignal
    ): Promise<void> {
        await this._axios.delete("/users/sessions", { signal })
    }

    public async resetPassword(
        oldPassword: string,
        newPassword: string,
        signal?: AbortSignal,
    ): Promise<void> {
        const res = await this._axios.post(
            "/users/resetPassword",
            { oldPassword, newPassword },
            { signal },
        );
    }

    /**
     * Gets the info of a user
     * 
     * @param username the username to get info for, if "self" then the info of the current user is returned
     */
    public async getUserInfo(
        username: string,
        props?: {
            /**
             * if true, the stats of the user are returned
             */
            stats: boolean
        },
        signal?: AbortSignal,
    ): Promise<UserInfo> {
        let url = "/users/" + encodeURIComponent(username) + "/info";
        if (props?.stats) {
            url += "?stats=true";
        }
        const res = await this._axios.get(url, { signal });
        return res.data;
    }

    public async createGDPRRequest(
        props: {
            password: string,
            isDeletion: boolean,
            keepPosts: boolean,
            note: string,
        }): Promise<void> {
        await this._axios.post("/users/gdprRequest", props);
    }

    public async getNotifications(): Promise<Notification[]> {
        return (await this._axios.get("/notifications")).data;
    }

    public async getNotificationsCount(): Promise<number> {
        return (await this._axios.get("/notifications/count")).data.count;
    }

    public async deleteNotification(id: string): Promise<void> {
        await this._axios.delete("/notifications/" + id);
    }

    public async getNotificationByEventId(eventId: string): Promise<Notification> {
        return (await this._axios.get("/notifications/byEventId/" + eventId)).data;
    }

    public async getInstanceInfo(): Promise<InstanceInfo> {
        return (await this._axios.get("/")).data;
    }

    public async resendVerificationEmail(email: string, captcha?: string) {
        await this._axios.post("/users/resendVerificationEmail", { email, captcha });
    }

    public async changeEmail(props: { email: string, password: string, captcha?: string }) {
        await this._axios.post("/users/changeEmail", props);
    }

    public async getSyncSettings(): Promise<SettingsSync> {
        return (await this._axios.get("/sync/settings")).data;
    }

    public async setSyncSettings(settings: Settings): Promise<void> {
        await this._axios.post("/sync/settings", settings);
    }
}

export type Gif = {
    id: string;
    url: string;
    previewGif: string | null;
    previewVideo: string | null;
    previewVideoWebm: string | null;
    size: Size | null;
    tags: string[];
    uploader: string;
    note: string | null;
    group: string | null;
};

export type Size = {
    width: number;
    height: number;
};

export type UserSession = {
    token: string;
    username: string;
}

export type UserInfo = {
    username: string;
    groups?: string[];
    stats?: UserStats;
}

export type UserStats = {
    uploads: number;
}

export type Notification = {
    id: string,
    username: string,
    eventId: string,
    data: {
        type: "gdprRequest",
        username: string,
    } | {
        type: "gifEditSuggestion",
        username: string,
        gifId: string,
        tags: string[],
        note: string | null,
    },
};

const DeletableNotificationTypes = ["gdprRequest"];

export function isDeletableNotification(notification: Notification): boolean {
    return DeletableNotificationTypes.includes(notification.data.type);
}

export function hasGroup(group: string, groups: string[] | null) {
    if (!groups) return false;
    if (groups.indexOf("admin") != -1) return true;
    return groups.indexOf(group) != -1;
}

export type InstanceInfo = {
    allowSignup: boolean
    captcha?: {
        siteKey: string;
    },
    smtp?: {
        fromAddress: string;
    },
};
