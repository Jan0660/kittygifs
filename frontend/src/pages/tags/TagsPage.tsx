import { createSignal, type Component, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Tag } from "../../client/Client";
import "../../index.css";
import { tagCategories, tagsStore } from "../..";
import { SimpleTable } from "solid-simple-table";
import "solid-simple-table/dist/SimpleTable.css";
import { TagSpan } from "../../components/TagSpan";

const TagsPage: Component = () => {
    const [tags, setTags] = createSignal([] as Tag[]);
    type Row = {
        name: string;
        description?: string;
        count?: number;
        category?: string;
    };
    const [rows, setRows] = createSignal([] as Row[]);
    tagsStore.getSave().then(tags => {
        setTags(tags);
        const rows = tags.map(tag => {
            return {
                name: tag.name,
                description: tag.description,
                count: tag.count,
                category: tag.category,
            };
        });
        console.log(rows);
        setRows(rows);
    });
    const navigate = useNavigate();

    return (
        <>
            <div class="content-header">
                <h1>Tags</h1>
            </div>
            <div class="content-content">
                <A href="/tags/categories" class="link">Categories</A>
                <Show when={rows().length != 0} fallback={<h2>Loading...</h2>}>
                    {/* @ts-ignore */}
                    <SimpleTable
                        columns={[
                            {
                                id: "name",
                                label: "Name",
                                onClick: (e, row: Row) => {
                                    navigate("/tags/tag/" + row.name);
                                },
                            },
                            {
                                id: "description",
                                label: "Description",
                            },
                            {
                                id: "count",
                                label: "Count",
                            },
                            {
                                id: "category",
                                label: "Category",
                            },
                        ]}
                        rows={rows()}
                        bodyRenderer={(row: Row, columnId: string) => {
                            let color = null as string | null;
                            if (columnId == "name") {
                                if (row.category != null) {
                                    const category = tagCategories
                                        .getStore()
                                        .find(category => category.name == row.category);
                                    if (category?.color != null) {
                                        color = category.color;
                                    }
                                }
                                return (
                                    <TagSpan
                                        tagName={row[columnId]}
                                        styleAppend={"cursor: pointer;"}
                                    />
                                );
                            }
                            return row[columnId];
                        }}
                        defaultSortDirection={["count", "desc"]}
                        accessors={true}
                        className="solid-simple-table typography"
                        getRowID={(row: any) => "tagsTable." + (row as Row).name}
                    />
                </Show>
            </div>
        </>
    );
};

export default TagsPage;
