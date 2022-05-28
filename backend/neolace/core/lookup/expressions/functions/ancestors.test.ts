import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Ancestors, AndAncestors } from "./ancestors.ts";
import { AnnotatedValue, EntryValue, IntegerValue, MakeAnnotatedEntryValue, PageValue } from "../../values.ts";
import { This } from "../this.ts";
import { Count } from "./count.ts";
import { List } from "../list-expr.ts";
import { LiteralExpression } from "../literal-expr.ts";

group("ancestors.ts", () => {
    group("ancestors()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;
        const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

        test(`toString()`, async () => {
            assertEquals((new Ancestors(new This())).toString(), "this.ancestors()");
        });

        test("It can give all the ancestors of the ponderosa pine", async () => {
            const expression = new Ancestors(new This());

            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id, { distance: new IntegerValue(3) }),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id, {
                            distance: new IntegerValue(4),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {
                            distance: new IntegerValue(5),
                        }),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 5n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: ponderosaPine.id,
                    },
                ),
            );
        });
        test("It can give all the ancestors of [ponderosa pine, Mediterranean Cypress]", async () => {
            const expression = new Ancestors(
                new List([
                    new LiteralExpression(new EntryValue(defaultData.entries.ponderosaPine.id)),
                    new LiteralExpression(new EntryValue(defaultData.entries.mediterraneanCypress.id)),
                ]),
            );

            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.genusCupressus.id, {
                            distance: new IntegerValue(1),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyCupressaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id, { distance: new IntegerValue(3) }),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id, {
                            distance: new IntegerValue(4),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {
                            distance: new IntegerValue(5),
                        }),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 7n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: ponderosaPine.id,
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {
            const expression = new Count(new Ancestors(new This()));

            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(value, new IntegerValue(5));
        });
    });

    group("andAncestors()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;
        const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

        test(`toString()`, async () => {
            assertEquals((new AndAncestors(new This())).toString(), "this.andAncestors()");
        });

        test("It can give all the ancestors of the ponderosa pine", async () => {
            const expression = new AndAncestors(new This());
            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.ponderosaPine.id, {
                            distance: new IntegerValue(0),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id, { distance: new IntegerValue(3) }),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id, {
                            distance: new IntegerValue(4),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {
                            distance: new IntegerValue(5),
                        }),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 6n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: ponderosaPine.id,
                    },
                ),
            );
        });

        test("It can give all the ancestors of [ponderosa pine, Mediterranean Cypress]", async () => {
            const expression = new AndAncestors(
                new List([
                    new LiteralExpression(new EntryValue(defaultData.entries.ponderosaPine.id)),
                    new LiteralExpression(new EntryValue(defaultData.entries.mediterraneanCypress.id)),
                ]),
            );

            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.mediterraneanCypress.id, {
                            distance: new IntegerValue(0),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.ponderosaPine.id, {
                            distance: new IntegerValue(0),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.genusCupressus.id, {
                            distance: new IntegerValue(1),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyCupressaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id, { distance: new IntegerValue(3) }),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id, {
                            distance: new IntegerValue(4),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {
                            distance: new IntegerValue(5),
                        }),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 9n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: ponderosaPine.id,
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {
            const expression = new Count(new AndAncestors(new This()));

            const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);

            assertEquals(value, new IntegerValue(6));
        });

        /* Not reliable on the low-powered GitHub Actions CI runners
        const maxTime = 40;
        test(`It executes in < ${maxTime}ms`, async () => {
            const expression = new AndAncestors(new This());

            const start = performance.now();
            await graph.read(tx =>
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n}).then(v => v.makeConcrete())
            );
            const end = performance.now();
            assert(end - start < maxTime, `Expected andAncestors() to take under ${maxTime}ms but it took ${end - start}ms.`);
        });
        */
    });

    group("ancestors()/andAncestors() - additional tests", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        const siteId = VNID();
        const entryType = VNID(), entryIsA = VNID();
        const A = VNID(),
            B = VNID(),
            C = VNID(),
            D = VNID(),
            E = VNID(),
            F = VNID(),
            G = VNID(),
            H = VNID(),
            I = VNID();
        const context = new TestLookupContext({ siteId });

        const checkAncestors = async (entryId: VNID, expected: AnnotatedValue[]) => {
            // with ancestors():
            const expr1 = new Ancestors(new This());
            assertEquals(
                await context.evaluateExprConcrete(expr1, entryId),
                new PageValue([
                    ...expected,
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: BigInt(expected.length),
                    sourceExpression: expr1,
                    sourceExpressionEntryId: entryId,
                }),
            );

            // And with andAncestors():
            const expr2 = new AndAncestors(new This());
            assertEquals(
                await context.evaluateExprConcrete(expr2, entryId),
                new PageValue([
                    MakeAnnotatedEntryValue(entryId, { distance: new IntegerValue(0n) }),
                    ...expected,
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: BigInt(expected.length + 1),
                    sourceExpression: expr2,
                    sourceExpressionEntryId: entryId,
                }),
            );
        };

        test("Returns only the shortest distance to duplicate ancestors", async () => {
            // Create this entry tree:
            //     A    B
            //    / \  /  \
            //   C   D     E
            //    \ /     /|
            //     F    /  |  G
            //      \ /    | /
            //       H     I

            const graph = await getGraph();
            await graph.runAsSystem(
                CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test" }),
            );
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                    {
                        code: "CreateProperty",
                        data: { id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryType }] },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: B, name: "Entry B", type: entryType, friendlyId: "b", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: C, name: "Entry C", type: entryType, friendlyId: "c", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: E, name: "Entry E", type: entryType, friendlyId: "e", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: F, name: "Entry F", type: entryType, friendlyId: "f", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: G, name: "Entry G", type: entryType, friendlyId: "g", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: H, name: "Entry H", type: entryType, friendlyId: "h", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: I, name: "Entry I", type: entryType, friendlyId: "i", description: "" },
                    },
                    // C is a A
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: C,
                            valueExpression: `[[/entry/${A}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a A
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: D,
                            valueExpression: `[[/entry/${A}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a B
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: D,
                            valueExpression: `[[/entry/${B}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // E is a B
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: E,
                            valueExpression: `[[/entry/${B}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // F is a C
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: F,
                            valueExpression: `[[/entry/${C}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // F is a D
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: F,
                            valueExpression: `[[/entry/${D}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // H is a F
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: H,
                            valueExpression: `[[/entry/${F}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // H is a E
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: H,
                            valueExpression: `[[/entry/${E}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // I is a E
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: I,
                            valueExpression: `[[/entry/${E}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // I is a G
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: I,
                            valueExpression: `[[/entry/${G}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                ],
            }));

            // Check the ancestor of C
            await checkAncestors(C, [
                // Expect one ancestor, A:
                MakeAnnotatedEntryValue(A, { distance: new IntegerValue(1n) }),
            ]);

            // Check the ancestor of I
            await checkAncestors(I, [
                // Expect 2 immediate ancestors (E & G), plus one ancestor B at distance of 2.
                MakeAnnotatedEntryValue(E, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(G, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(2n) }),
            ]);

            // Check the ancestor of H
            await checkAncestors(H, [
                // We should find that H has 6 ancestors, and the distance from H to B is 2, from H to A is 3, and from H to E is 1
                MakeAnnotatedEntryValue(E, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(F, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(D, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(A, { distance: new IntegerValue(3n) }),
            ]);
        });

        test("Works despite cyclic relationships", async () => {
            // Create this entry tree:
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D
            //      \
            //       A (same A as above)

            const graph = await getGraph();
            await graph.runAsSystem(
                CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test" }),
            );
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                    {
                        code: "CreateProperty",
                        data: { id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryType }] },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: B, name: "Entry B", type: entryType, friendlyId: "b", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: C, name: "Entry C", type: entryType, friendlyId: "c", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { id: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                    },
                    // B is a A
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: B,
                            valueExpression: `[[/entry/${A}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // C is a A
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: C,
                            valueExpression: `[[/entry/${A}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a B
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: D,
                            valueExpression: `[[/entry/${B}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a C
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: D,
                            valueExpression: `[[/entry/${C}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // A is a D
                    {
                        code: "AddPropertyValue",
                        data: {
                            entryId: A,
                            valueExpression: `[[/entry/${D}]]`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                ],
            }));

            // Check the ancestor of D
            await checkAncestors(D, [
                // B and C at a distance of 1, A at a distance of 2
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(A, { distance: new IntegerValue(2n) }),
            ]);

            // Check the ancestor of A
            await checkAncestors(A, [
                // D at a distance of 1, B and C at a distance of 2
                MakeAnnotatedEntryValue(D, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(2n) }),
            ]);
        });
    });
});
