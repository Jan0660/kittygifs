import { Axios } from "axios";

export class KittyGifsClient {
    private _axios: Axios;

    constructor(baseUrl: string, password: string | null = null) {
        this._axios = new Axios({
            baseURL: baseUrl,
            headers: password != null ? { "x-session-token": password } : {},
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
        },
        signal?: AbortSignal,
    ): Promise<void> {
        if (props.group == "") {
            props.group = null;
        }
        await this._axios.patch("/gifs/" + encodeURIComponent(id), props, {
            signal: signal,
        });
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
        signal?: AbortSignal,
    ): Promise<UserSession> {
        const res = await this._axios.post(
            "/users",
            { username: username, password: password },
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
