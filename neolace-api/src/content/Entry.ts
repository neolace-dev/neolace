import { Schema, Type, string, vnidString, nullable, array, number, Record, Validator } from "../api-schemas.ts";
import { PropertyType } from "../schema/SiteSchemaData.ts";
import { LookupValueSchema } from "./lookup-value.ts";


export enum GetEntryFlags {
    IncludePropertiesSummary = "propertiesSummary",
    IncludeReferenceCache = "referenceCache",
    /**
     * Include special "features" of this entry, like the article text or the contained image.
     */
    IncludeFeatures = "features",
    /**
     * Include the unevaluated lookup expressions for every property that is directly set on this entry.
     * This is useful for editing or exporting, but not really for viewing the entry.
     */
    IncludeRawProperties = "propertiesRaw",
}


/**
 * Defines the information needed to display a property value in the frontend
 */
export const DisplayedPropertySchema = Schema({
    propertyId: vnidString,
    value: LookupValueSchema,
});
export type DisplayedPropertyData = Type<typeof DisplayedPropertySchema>;

export const RawPropertySchema = Schema({
    propertyId: vnidString,
    facts: array.of(Schema({
        valueExpression: string,
        note: string,
        rank: number,
        slot: string,
    })),
});

export enum ImageSizingMode {
    /** The image should never be cropped when scaled to fit in a container */
    Contain = "contain",
    /* When scaling this image to fit in a container, it can be cropped to match the container's aspect ratio */
    Cover = "cover",
}

export const EntryFeaturesSchema = Schema({
    Article: Schema({
        articleMD: string,
        headings: array.of(Schema({title: string, id: string})),
    }).strictOptional(),

    Files: Schema({
        files: array.of(Schema({
            filename: string,
            url: string,
            contentType: string,
            size: number,
        })),
    }).strictOptional(),

    Image: Schema({
        imageUrl: string,
        contentType: string,
        size: number,
        sizing: Schema.enum(ImageSizingMode),
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
        /** RGBA array of values from 0-255 */
        borderColor: array.of(number).strictOptional(),
    }).strictOptional(),

    HeroImage: Schema({
        entryId: vnidString,
        imageUrl: string,
        caption: string,
        sizing: Schema.enum(ImageSizingMode),
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
        /** RGBA array of values from 0-255 */
        borderColor: array.of(number).strictOptional(),
    }).strictOptional(),
});
export type EntryFeaturesData = Type<typeof EntryFeaturesSchema>;


// The "reference cache" contains details (name, friendlyId, entry type) for every entry mentioned in the entry's
// description, article text, computed facts, related object notes, and so on.
export const ReferenceCacheSchema = Schema({
    // We can't use the VNID type as Record keys unfortunately, but the keys here are VNIDs
    entryTypes: Record(string, Schema({
        id: vnidString,
        name: string,
    })),
    entries: Record(string, Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        description: string,
        entryType: Schema({id: vnidString}),
    })),
    properties: Record(string, Schema({
        id: vnidString,
        name: string,
        description: string,
        type: Schema.enum(PropertyType),
        standardURL: string,
        importance: number,
        displayAs: string,
    })),
    lookups: array.of(Schema({
        entryContext: vnidString.strictOptional(),  // VNID of the entry where the lookup expression was referenced, if applicable.
        lookupExpression: string,  // The lookup expression as parsed by the MDT library in the Neolace API
        value: LookupValueSchema,
    })),
});

export type ReferenceCacheData = Type<typeof ReferenceCacheSchema>;
export type RefCacheEntryTypeData = ReferenceCacheData["entryTypes"]["key"];
export type RefCacheEntryData = ReferenceCacheData["entries"]["key"];
export type RefCachePropertyData = ReferenceCacheData["properties"]["key"];


export const EntrySchema = Schema({
    id: vnidString,
    name: string,
    description: nullable(string),
    friendlyId: string,
    entryType: Schema({
        id: vnidString,
        name: string,
    }),

    /** Summary of properties for this entry (up to 20 properties, with importance < 20) */
    propertiesSummary: array.of(DisplayedPropertySchema).strictOptional(),

    /** Some details about all entries mentioned by this entry */
    referenceCache: ReferenceCacheSchema.strictOptional(),

    features: EntryFeaturesSchema.strictOptional(),

    propertiesRaw: array.of(RawPropertySchema).strictOptional(),

    featuredImage: Schema({
        entryId: vnidString,
        /** Markdown caption for this featured image */
        note: string.strictOptional(),
    }).strictOptional(),
});
export type EntryData = Type<typeof EntrySchema>;

export const PaginatedResult = <T>(itemSchema: Validator<T>) => Schema({
    values: array.of(itemSchema),
    totalCount: number.strictOptional(),
    nextPageUrl: string.strictOptional(),
});
export type PaginatedResultData<T> = {values: T[], totalCount?: number, nextPageUrl?: string};

export const EntrySummarySchema = Schema({
    id: vnidString,
    type: Schema({id: vnidString}),
    name: string,
    friendlyId: string,
});
export type EntrySummaryData = Type<typeof EntrySummarySchema>;
