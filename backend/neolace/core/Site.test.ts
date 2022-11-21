import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertStrictEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite, Site } from "neolace/core/Site.ts";
import { CreateUser } from "neolace/core/User.ts";

group("Site.ts", () => {
    group("CreateSite", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        // Note: CreateSite is mostly tested via the REST API tests, but there are some low-level tests here
        // for things that are easier to test at this level (like specific site code tests)

        test("Can create a Site with a specific values", async () => {
            const graph = await getGraph();
            const result = await graph.runAsSystem(
                CreateSite({ name: "Test Site", id: VNID("_12345"), slugId: "site-test1", domain: "test.neolace.net" }),
            );
            assertEquals(result.id, VNID("_12345"));
            const result2 = await graph.pullOne(Site, (s) => s.slugId.domain.id);
            assertEquals(result2.slugId, "site-test1");
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
                slugId: "site-test1",
                domain: "test1.neolace.net",
                description: "A site managed by Jamie",
                adminUser: jamie.id,
            }));
            // Read the resulting site and its groups:
            const siteResult = await graph.pullOne(Site, (s) => s.groupsFlat((g) => g.allProps), { key: "site-test1" });
            assertStrictEquals(siteResult.groupsFlat.length, 1);
            assertStrictEquals(siteResult.groupsFlat[0].name, "Administrators");
            assertEquals(siteResult.groupsFlat[0].grantStrings, ["*"]);
        });
    });
});
