import { Tag } from "../client/Client";
import { tagCategories, tagsStore } from "..";

export const TagSpan = ({
    tagName,
    tagNameShow,
    tag,
    noStyle,
    styleAppend,
}: {
    tagName: string;
    tagNameShow?: string;
    tag?: Tag;
    noStyle?: boolean;
    styleAppend?: string;
}) => {
    return (
        <span
            class="tag"
            style={
                (tagsStore.getStore() != null && !noStyle ? (() => {
                    tag ??= tagsStore.getStore()?.find(tag => tag.name == tagName);
                    const color = tagCategories.getStore()?.find(category => category.name == tag?.category)?.color;
                    if (color == undefined) {
                        return "";
                    }
                    return `border: 1px solid #${color} !important; color: #${color} !important;`;
                })() : "") + styleAppend}
                >
            {tagNameShow ?? tagName}
        </span>
    );
};
