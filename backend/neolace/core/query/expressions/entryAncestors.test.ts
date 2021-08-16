import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { EntryAncestors } from "./entryAncestors.ts";
import { AnnotatedEntryValue, IntegerValue, PageValue } from "../values.ts";

group(import.meta, () => {

    group("entryAncestors()", () => {

        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It can give all the ancestors of the ponderosa pine", async () => {
            const expression = new EntryAncestors();

            const value = await graph.read(tx => 
                expression.getValue().getValueFor({tx, siteId, entryId: ponderosaPine.id})
            );

            assertEquals(
                value,
                new PageValue(
                    [
                        new AnnotatedEntryValue(defaultData.entries.genusPinus.id,           {distance: new IntegerValue(1)}),
                        new AnnotatedEntryValue(defaultData.entries.familyPinaceae.id,       {distance: new IntegerValue(2)}),
                        new AnnotatedEntryValue(defaultData.entries.orderPinales.id,         {distance: new IntegerValue(3)}),
                        new AnnotatedEntryValue(defaultData.entries.classPinopsida.id,       {distance: new IntegerValue(4)}),
                        new AnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {distance: new IntegerValue(5)}),
                    ],
                    {
                        pageSize: 100n,
                        startedAt: 0n,
                        totalCount: 5n
                    },
                ),
            );
        });

    });
});
