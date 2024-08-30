import { Axios } from "axios";
import { Settings, SettingsSync } from "..";

export class KittyGifsClient {
    /** Use if you know what you're doing <3 */
    public _axios: Axios;
    public tags: KittyGifsClientTags;
    public users: KittyGifsClientUsers;
    public notifications: KittyGifsClientNotifications;
    public sync: KittyGifsClientSync;
    public gifs: KittyGifsClientGifs;
    public logto: KittyGifsClientLogto;

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
        this.tags = new KittyGifsClientTags(this);
        this.users = new KittyGifsClientUsers(this);
        this.notifications = new KittyGifsClientNotifications(this);
        this.sync = new KittyGifsClientSync(this);
        this.gifs = new KittyGifsClientGifs(this);
        this.logto = new KittyGifsClientLogto(this);
    }

    public async getInstanceInfo(): Promise<InstanceInfo> {
        return (await this._axios.get("/")).data;
    }
}

class KittyGifsClientUsers {
    public client: KittyGifsClient;
    public sessions: KittyGifsClientUsersSessions;

    constructor(client: KittyGifsClient) {
        this.client = client;
        this.sessions = new KittyGifsClientUsersSessions(client);
    }

    /** Creates a new user. */
    public async post(
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
        const res = await this.client._axios.post(
            "/users",
            { username: username, password: password, captcha: captcha, email: email },
            { signal },
        );
        return res.data;
    }

    public async resetPassword(
        oldPassword: string,
        newPassword: string,
        signal?: AbortSignal,
    ): Promise<void> {
        const res = await this.client._axios.post(
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
        const res = await this.client._axios.get(url, { signal });
        return res.data;
    }

    public async createGDPRRequest(
        props: {
            password: string,
            isDeletion: boolean,
            keepPosts: boolean,
            note: string,
        }): Promise<void> {
        await this.client._axios.post("/users/gdprRequest", props);
    }

    public async changeEmail(props: { email: string, password: string, captcha?: string }) {
        await this.client._axios.post("/users/changeEmail", props);
    }

    public async resendVerificationEmail(email: string, captcha?: string) {
        await this.client._axios.post("/users/resendVerificationEmail", { email, captcha });
    }
}

class KittyGifsClientUsersSessions {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    /** Creates a new session. */
    public async post(
        username: string,
        password: string,
        signal?: AbortSignal,
    ): Promise<string> {
        const res = await this.client._axios.post(
            "/users/sessions",
            { username: username, password: password },
            { signal },
        );
        return res.data.token;
    }

    public async delete(
        token: string,
        signal?: AbortSignal,
    ): Promise<void> {
        await this.client._axios.delete("/users/sessions/" + encodeURIComponent(token), { signal },);
    }

    /** Deletes all sessions except the current one. */
    public async deleteAllOtherSessions(
        signal?: AbortSignal
    ): Promise<void> {
        await this.client._axios.delete("/users/sessions", { signal })
    }
}

class KittyGifsClientNotifications {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    /** Gets all notifications. */
    public async get(): Promise<Notification[]> {
        return (await this.client._axios.get("/notifications")).data;
    }

    /** Gets the number of notifications. */
    public async getCount(): Promise<number> {
        return (await this.client._axios.get("/notifications/count")).data.count;
    }

    /** Deletes a notification. */
    public async delete(id: string): Promise<void> {
        await this.client._axios.delete("/notifications/" + id);
    }

    public async getByEventId(eventId: string): Promise<Notification> {
        return (await this.client._axios.get("/notifications/byEventId/" + eventId)).data;
    }
}

class KittyGifsClientSync {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    public async getSettings(): Promise<SettingsSync> {
        return (await this.client._axios.get("/sync/settings")).data;
    }

    public async setSettings(settings: Settings): Promise<void> {
        await this.client._axios.post("/sync/settings", settings);
    }
}

class KittyGifsClientTags {
    public client: KittyGifsClient;
    public categories: KittyGifsClientTagsCategories;

    constructor(client: KittyGifsClient) {
        this.client = client;
        this.categories = new KittyGifsClientTagsCategories(client);
    }

    public async getAll(): Promise<Tag[]> {
        return (await this.client._axios.get("/tags")).data;
    }

    public async get(name: string): Promise<Tag> {
        return (await this.client._axios.get("/tags/" + encodeURIComponent(name))).data;
    }

    /** Forces an update of tag use counts. User must have `admin` group. */
    public async update() : Promise<void> {
        await this.client._axios.post("/tags/update");
    }

    /** Updates a tag. If a field in `props` is undefined, it will still be set to null by the backend. */
    public async patch(name: string, props: {
        category?: string;
        description?: string;
        implications?: string[];
    }): Promise<void> {
        await this.client._axios.patch("/tags/" + encodeURIComponent(name), props);
    }

    /** Deletes a tag and all its usages. */
    public async delete(name: string) {
        await this.client._axios.delete("/tags/" + encodeURIComponent(name));
    }

    /** Renames a tag an all its usages */
    public async rename(name: string, newName: string) {
        await this.client._axios.post("/tags/" + encodeURIComponent(name) + "/rename?new=" + encodeURIComponent(newName));
    }
}

class KittyGifsClientTagsCategories {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    public async getAll(): Promise<TagCategory[]> {
        return (await this.client._axios.get("/tags/categories")).data;
    }

    public async post(category: TagCategory): Promise<void> {
        await this.client._axios.post("/tags/categories", category);
    }

    public async patch(name: string, props: {
        name?: string;
        description?: string;
        color?: string;
    }): Promise<void> {
        await this.client._axios.patch("/tags/categories/" + encodeURIComponent(name), props);
    }

    public async delete(name: string): Promise<void> {
        await this.client._axios.delete("/tags/categories/" + encodeURIComponent(name));
    }
}

class KittyGifsClientGifs {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    public async search(query: string, signal?: AbortSignal, props?: {
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
        let res = await this.client._axios.get(url, {
            signal,
        });
        return res.data;
    }

    public async get(id: string, signal?: AbortSignal): Promise<Gif> {
        let res = await this.client._axios.get("/gifs/" + encodeURIComponent(id), { signal });
        return res.data;
    }

    public async patch(
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
        await this.client._axios.patch(url, props, {
            signal: signal,
        });
    }

    public async postEditSuggestion(id: string, props: {
        tags: string[];
        note: string;
    }): Promise<void> {
        await this.client._axios.post("/gifs/" + encodeURIComponent(id) + "/edit/suggestions", props);
    }

    public async post(
        props: {
            url: string;
            tags: string[];
            note: string;
            group: string | null;
        },
        signal?: AbortSignal,
    ): Promise<Gif> {
        const res = await this.client._axios.post("/gifs", props, { signal: signal });
        return res.data;
    }

    public async delete(id: string, signal?: AbortSignal): Promise<Gif> {
        const res = await this.client._axios.delete("/gifs/" + encodeURIComponent(id), {
            signal,
        });
        return res.data;
    }

}

class KittyGifsClientLogto {
    public client: KittyGifsClient;

    constructor(client: KittyGifsClient) {
        this.client = client;
    }

    public async registerAccount(props: { logtoFirstId: string, username: string }): Promise<UserSession> {
        return (await this.client._axios.post("/logto/registerAccount", props)).data;
    }

    public async getSessionToken(token: string): Promise<string> {
        return (await this.client._axios.get("/logto/sessionToken?token=" + encodeURIComponent(token))).data.token;
    }

    public async link(logtoFirstId: string) {
        await this.client._axios.post("/logto/link", { logtoFirstId });
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
    logto?: {
        endpoint: string;
        appId: string;
    },
};

export type Tag = {
    name: string;
    count: number;
    description?: string;
    implications?: string[];
    category?: string;
}

export type TagCategory = {
    name: string;
    description?: string;
    /** 6-char hex color string, e.g. `BEEFEE` */
    color?: string;
}
