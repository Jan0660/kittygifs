import { createSignal, type Component, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { hasGroup } from "../../client/Client";
import "../../index.css";
import { client, tagCategories, userInfo } from "../..";
import { SimpleTable } from "solid-simple-table";
import "solid-simple-table/dist/SimpleTable.css";

const TagCategoriesPage: Component = () => {
    type Row = {
        name: string;
        description?: string;
        color?: string;
    };
    const [rows, setRows] = createSignal([] as Row[]);
    tagCategories.getSave().then(categories => {
        const rows = categories.map(tag => {
            return {
                name: tag.name,
                description: tag.description,
                color: tag.color,
            };
        });
        console.log(rows);
        setRows(rows);
    });
    const navigate = useNavigate();
    const [newCategoryName, setNewCategoryName] = createSignal("");

    return (
        <>
            <div class="content-header">
                <h1>Tag Categories</h1>
            </div>
            <div class="content-content">
                <Show when={rows().length != 0} fallback={<h2>Loading...</h2>}>
                    {/* @ts-ignore */}
                    <SimpleTable
                        columns={[
                            {
                                id: "name",
                                label: "Name",
                                onClick: (e, row: Row) => {
                                    navigate("/tags/categories/category/" + row.name);
                                },
                            },
                            {
                                id: "description",
                                label: "Description",
                            },
                        ]}
                        rows={rows()}
                        bodyRenderer={(row: Row, columnId: string) => {
                            if (columnId == "name") {
                                return (
                                    <span
                                        style={
                                            "cursor: pointer;" +
                                            (row.color !== null
                                                ? `color: #${row.color} !important;`
                                                : "")
                                        }
                                    >
                                        {row[columnId]}
                                    </span>
                                );
                            }
                            return row[columnId];
                        }}
                        defaultSortDirection={["name", "asc"]}
                        accessors={true}
                        className="solid-simple-table typography"
                        getRowID={(row: any) => "tagsTable." + (row as Row).name}
                    />
                </Show>
                <Show when={hasGroup("perm:edit_tags", userInfo.getStore()?.groups)}>
                    <h2>New Category</h2>
                    <label>Name: </label>
                    <input type="text" class="input" value={newCategoryName()} onChange={e => {
                        setNewCategoryName(e.currentTarget.value);
                    }} />
                    <br />
                    <button class="button primary" onClick={async () => {
                        await client.tags.categories.post({
                            name: newCategoryName(),
                        });
                        navigate("/tags/categories/category/" + newCategoryName());
                    }}>Create</button>
                </Show>
            </div>
        </>
    );
};

export default TagCategoriesPage;
