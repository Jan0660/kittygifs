import { lazy, type Component, createResource, ErrorBoundary } from "solid-js";
import { Route, Routes } from "@solidjs/router";
import { client, getErrorString } from ".";

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
            <a href="/">
                <p>kitties!!</p>
            </a>
            <ErrorBoundary
                fallback={e => {
                    console.error(e);
                    return <h1>Failed to load :( - {getErrorString(e)}</h1>;
                }}
            >
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
            </ErrorBoundary>
        </>
    );
};

export default App;
