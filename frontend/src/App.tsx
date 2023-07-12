import { lazy, type Component, createResource, ErrorBoundary, Show } from "solid-js";
import { Route, Routes } from "@solidjs/router";
import { client, getErrorString, config } from ".";

export function GifViewData({ params }) {
    const fetchGif = async () => {
        return await client.getGif(params.id);
    };
    const [gif] = createResource(() => params.id, fetchGif);
    return gif;
}

const App: Component = () => {
    return (
        <>
            <div class="navbar">
                <div class="navbar-content">
                    <span class="site-name">
                        <a href="/" class="link">
                            kitties!!
                        </a>
                    </span>
                    <ul class="navbar-links">
                        <li>
                            <Show when={config.token == null}>
                                <a href="/login" class="link">Login</a> or {" "}
                                <a href="/signup" class="link">Signup</a>
                            </Show>
                            <Show when={config.token != null}>
                                <a href="/logout" class="link">Log out</a> or {" "}
                                <a href="/resetPassword" class="link">Reset Password</a>
                            </Show>
                            <Show when={config.token != null}>
                                <a href="/gifs/post">Post</a>
                                <br />
                            </Show>
                        </li>
                    </ul>
                </div>
            </div>
            <ErrorBoundary
                fallback={e => {
                    console.error(e);
                    return <h1>Failed to load :( - {getErrorString(e)}</h1>;
                }}
            >
                <div class="content">
                    <Routes>
                        <Route path="/" component={lazy(() => import("./pages/IndexPage"))} />
                        <Route path="/popup" component={lazy(() => import("./pages/PopupPage"))} />
                        <Route
                            path="/gifs/:id"
                            data={GifViewData}
                            component={lazy(() => import("./pages/GifPage"))}
                        />
                        <Route
                            path="/gifs/:id/edit"
                            data={GifViewData}
                            component={lazy(() => import("./pages/EditGifPage"))}
                        />
                        <Route
                            path="/gifs/post"
                            component={lazy(() => import("./pages/PostGifPage"))}
                        />
                        <Route path="/login" component={lazy(() => import("./pages/LoginPage"))} />
                        <Route path="/logout" component={lazy(() => import("./pages/LogoutPage"))} />
                        <Route path="/signup" component={lazy(() => import("./pages/SignupPage"))} />
                        <Route
                            path="/resetPassword"
                            component={lazy(() => import("./pages/ResetPasswordPage"))}
                        />
                    </Routes>
                </div>
            </ErrorBoundary>
        </>
    );
};

export default App;
