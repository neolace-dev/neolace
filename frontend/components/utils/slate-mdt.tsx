import React from "react";
import { Icon } from "components/widgets/Icon";
import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { api, useLookupExpression, useSiteSchema } from "lib/api-client";
import { type MDT } from "neolace-api";
import { Transforms } from "slate";
import { RenderElementProps, useSlate, ReactEditor } from "slate-react";
import type { VoidEntryNode, VoidEntryTypeNode, VoidPropNode } from "./slate";
import './slate.ts';

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents a property, and displays it in a human-readable way. This allows us to store the
 * property VNID in the actual markdown/lookup code, but display it to the user as a nice friendly property name.
 */
export const PropertyVoid = ({ propertyId, attributes, children }: {propertyId: api.VNID, attributes: Record<string, unknown>, children: React.ReactNode}) => {
    const [schema] = useSiteSchema();
    const propertyName = schema ? (propertyId ? schema.properties[propertyId]?.name : `Unknown property (${propertyId})`) : "Loading...";
    return <span contentEditable={false} {...attributes} className="text-sm font-medium font-sans">
        <span className="rounded-l-md py-[3px] px-2 bg-gray-200 text-green-700">
            <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="diamond-fill"/></span>
        </span>
        <span className="rounded-r-md py-[3px] px-2 bg-gray-100 text-gray-700">{propertyName}</span>
        {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
    </span>;
}

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents an entry type, and displays it in a human-readable way.
 */
export const EntryTypeVoid = ({ entryTypeId, attributes, children }: {entryTypeId: api.VNID, attributes: Record<string, unknown>, children: React.ReactNode}) => {
    const [schema] = useSiteSchema();
    const entryTypeName = schema ? (schema.entryTypes[entryTypeId]?.name ?? `Unknown entry type (${entryTypeId})`) : "Loading...";
    const entryTypeColor = schema?.entryTypes[entryTypeId]?.color ?? api.EntryTypeColor.Default;
    return <span contentEditable={false} {...attributes} className="text-sm font-medium font-sans">
        <span className="rounded-l-md py-[3px] px-2 bg-gray-200" style={{color: api.entryTypeColors[entryTypeColor][2]}}>
            <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="square-fill"/></span>
        </span>
        <span className="rounded-r-md py-[3px] px-2 bg-gray-100 text-gray-700">{entryTypeName}</span>
        {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
    </span>;
}

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents an entry. This allows us to store the
 * property VNID in the actual markdown/lookup code, but display it to the user as a nice friendly property name.
 */
export const EntryVoid = ({ entryId, attributes, children }: {entryId: api.VNID, attributes: Record<string, unknown>, children: React.ReactNode}) => {
    // TBD: we need a hook to get the current draft OR current entry + refCache
    const lookupData = useLookupExpression(`[[/entry/${entryId}]]`);
    const entryData = lookupData.result?.referenceCache.entries[entryId];
    const entryName = entryData?.name ?? `Entry ${entryId}`;
    const entryTypeData = lookupData.result?.referenceCache.entryTypes[entryData?.entryType.id ?? ""];
    const colors = api.entryTypeColors[entryTypeData?.color ?? api.EntryTypeColor.Default];
    const abbrev = entryTypeData?.abbreviation ?? "";
    return (
        <span
            contentEditable={false}
            {...attributes}
            className="text-sm font-medium font-sans"
            style={{
                "--entry-type-color-0": colors[0],
                "--entry-type-color-1": colors[1],
                "--entry-type-color-2": colors[2],
            } as React.CSSProperties}
        >
            <span className="rounded-l-md py-[2px] min-w-[2em] text-center inline-block bg-entry-type-color-1 text-entry-type-color-2">
                <span className="text-xs inline-block min-w-[1.4em] text-center opacity-40">{abbrev}</span>
            </span>
            <span className="rounded-r-md py-[3px] px-2 bg-gray-50 hover:bg-entry-type-color-0 text-black hover:text-entry-type-color-2">{entryName}</span>
            {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
        </span>
    );
}

/**
 * In "visual mode" for editing an MDT (Markdown) document, this is how an inline lookup expression is rendered.
 * The lookup expression can be edited.
 */
export const InlineLookupEditableElement = ({element, attributes, children}: {element: MDT.InlineLookupNode, attributes: RenderElementProps["attributes"], children: React.ReactNode}) => {
    const editor = useSlate();

    const handleChange = React.useCallback((newValue: string) => {
        // We need to replace the text child node of the inline_lookup node, to reflect the new value.
        const path = ReactEditor.findPath(editor, element);  // Path to the "lookup_inline" node
        // "if you specify a Path location, it will expand to a range that covers the entire node at that path.
        //  Then, using the range-based behavior it will delete all of the content of the node, and replace it with
        //  your text. So to replace the text of an entire node with a new string you can do:"
        Transforms.insertText(editor, newValue, {at: [...path, 0], voids: true});
    }, [editor, element]);

    return <div className="inline-block select-none" contentEditable={false}>
        <LookupExpressionInput value={element.children[0].text} onChange={handleChange} className="inline-block w-auto !min-w-[100px] md:!min-w-[100px] border-none outline-blue-700 text-blue-800 before:content-['{'] after:content-['}'] before:opacity-50 after:opacity-50" />
        {children}
    </div>
};

export function renderElement({element, children, attributes}: RenderElementProps): JSX.Element {
    switch (element.type) {
        case "link":
            return <a href="#" {...attributes}>{children}</a>;
        // case "code_inline":
        //     return <code key={key}>{node.children[0].text}</code>;
        case "lookup_inline": {
            return <InlineLookupEditableElement element={element} attributes={attributes}>{children}</InlineLookupEditableElement>;
        }
        case "strong":
            return <strong {...attributes}>{children}</strong>;
        case "em":
            return <em {...attributes}>{children}</em>;
        case "s": // strikethrough
            return <s {...attributes}>{children}</s>;
        // case "hardbreak":
        //     return <br key={key} />;
        case "sub":
            return <sub {...attributes}>{children}</sub>;
        case "sup":
            return <sup {...attributes}>{children}</sup>;
        // case "footnote_ref": {
        //     const footnoteParagraph = (context[footnotes] as any)[node.footnoteId].children[0];
        //     return <HoverClickNote key={key} displayText={node.referenceText}>
        //         <p className="text-sm">{footnoteParagraph.children.map((child: any) => inlineNodeToComponent(child, context))}</p>
        //     </HoverClickNote>
        // }
        // case "footnote_inline":
        //     return <HoverClickNote key={key}>
        //         <p className="text-sm">{node.children.map(child => inlineNodeToComponent(child, context))}</p>
        //     </HoverClickNote>

        // Block elements:

        case "paragraph":
            return <p {...attributes}>{children}</p>;
        case "custom-void-entry":
            return <EntryVoid entryId={(element as VoidEntryNode).entryId} attributes={attributes}>{children}</EntryVoid>;
        case "custom-void-property":
            return <PropertyVoid propertyId={(element as VoidPropNode).propertyId} attributes={attributes}>{children}</PropertyVoid>;
        case "custom-void-entry-type":
            return <EntryTypeVoid entryTypeId={(element as VoidEntryTypeNode).entryTypeId} attributes={attributes}>{children}</EntryTypeVoid>;
        default:
            return <span className="border-red-100 border-[1px] text-red-700">{`Unknown MDT node "${element.type}"`}</span>;
    }
}
