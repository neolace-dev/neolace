import { C, GenericCypherAction, VNID } from "neolace/deps/vertex-framework.ts";
import {
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    assertStrictEquals,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite, Site } from "neolace/core/Site.ts";
import { CreateUser } from "neolace/core/User.ts";

group("Site.ts", () => {
    group("FriendlyId", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);
        test("Friendly IDs for sites must be unique, even if we bypass CreateSite", async () => {
            const graph = await getGraph();
            const site1 = await graph.runAsSystem(CreateSite({
                name: "Test Site 1",
                friendlyId: "test1",
                domain: "test1.neolace.net",
                description: "1",
            }));
            const site2 = await graph.runAsSystem(CreateSite({
                name: "Test Site 2",
                friendlyId: "test2",
                domain: "test2.neolace.net",
                description: "2",
            }));
            const err = await assertRejects(() =>
                graph.runAsSystem(
                    GenericCypherAction({
                        cypher: C`
                            MATCH (site1:${Site} {id: ${site1.id}})
                            MATCH (site2:${Site} {id: ${site2.id}})
                            SET site2.friendlyId = site1.friendlyId
                            RETURN null
                        `,
                        modifiedNodes: [site2.id],
                        description: "Forcibly set the friendlyId to conflict with an existing site.",
                    }),
                )
            );
            assertInstanceOf(err, Error);
            assert(err.message.includes("failed during apply()"));
            assertInstanceOf(err.cause, Error);
            assert(err.cause.message.includes("already exists"));
        });
    });
    group("CreateSite", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        // Note: CreateSite is mostly tested via the REST API tests, but there are some low-level tests here
        // for things that are easier to test at this level.

        test("Can create a Site with a specific values", async () => {
            const graph = await getGraph();
            const result = await graph.runAsSystem(
                CreateSite({ name: "Test Site", id: VNID("_12345"), friendlyId: "test1", domain: "test.neolace.net" }),
            );
            assertEquals(result.id, VNID("_12345"));
            const result2 = await graph.pullOne(Site, (s) => s.friendlyId.domain.id);
            assertEquals(result2.friendlyId, "test1");
            assertEquals(result2.id, VNID("_12345"));
            assertEquals(result2.domain, "test.neolace.net");
        });

        test("Can create Sites with a default administrators group", async () => {
            const graph = await getGraph();
            // Create a user:
            const jamie = await graph.runAsSystem(CreateUser({
                id: VNID(),
                authnId: -1,
                email: "jamie@neolace.net",
                fullName: "Jamie Admin",
            }));
            // Create a site, specifying that user as the new administrator:
            await graph.runAsSystem(CreateSite({
                name: "Test Site",
                friendlyId: "test1",
                domain: "test1.neolace.net",
                description: "A site managed by Jamie",
                adminUser: jamie.id,
            }));
            // Read the resulting site and its groups:
            const siteResult = await graph.pullOne(Site, (s) => s.groupsFlat((g) => g.allProps), {
                where: C`@this.friendlyId = "test1"`,
            });
            assertStrictEquals(siteResult.groupsFlat.length, 1);
            assertStrictEquals(siteResult.groupsFlat[0].name, "Administrators");
            assertEquals(siteResult.groupsFlat[0].grantStrings, ["*"]);
        });
    });
});
