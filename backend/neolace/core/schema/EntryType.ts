import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    Field,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";

import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";
// Since PropertyFact references Entry, this will create circular import issues:
//import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";

/**
 * Schema definition for a type of entry
 */
export class EntryType extends VNodeType {
    static label = "EntryType";
    static properties = {
        ...VNodeType.properties,
        /** The name of this entry type */
        name: Field.String,
        /** Description: Short, rich text summary of the entry type  */
        description: Field.NullOr.String.Check(check.string.trim().max(5_000)),
        /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
        friendlyIdPrefix: Field.NullOr.Slug.Check(check.string.regexp(/.*-$/)),  // Must end in a hyphen
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /** Which Site this entry type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        HAS_FEATURE: {
            to: [EnabledFeature],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        /** This EntryType has property values */
        // PROP_FACT: {
        //     to: [PropertyFact],
        //     cardinality: VNodeType.Rel.ToManyUnique,
        // },
        /** This EntryType has simple property values */
        HAS_SIMPLE_PROP: {
            to: [SimplePropertyValue],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
        simplePropValues: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.HAS_SIMPLE_PROP}]->(@target)`,
            target: SimplePropertyValue,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        // numRelatedImages,
    });
}
