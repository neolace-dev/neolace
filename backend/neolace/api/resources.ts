import { HomePageResource } from "./index.ts";
import { HealthCheckResource } from "./health.ts";
import { RequestLoginResource } from "./auth/request-login.ts";
import { PasswordlessLoginWebhookResource } from "./auth/hooks/passwordless-login.ts";
import { SystemKeyResource } from "./auth/system-key.ts";
import { SiteLookupResource } from "./site/lookup.ts";
import { SiteHomeResource } from "./site/{siteShortId}/home.ts";
import { SchemaIndexResource } from "./site/{siteShortId}/schema/index.ts";
import { DraftIndexResource } from "./site/{siteShortId}/draft/index.ts";
import { DraftResource } from "./site/{siteShortId}/draft/{draftId}/index.ts";
import { DraftFileResource } from "./site/%7BsiteShortId%7D/draft/%7BdraftId%7D/file.ts";
import { AcceptDraftResource } from "./site/{siteShortId}/draft/{draftId}/accept.ts";
import { EntryListResource } from "./site/%7BsiteShortId%7D/entry/index.ts";
import { EntryResource } from "./site/{siteShortId}/entry/{entryId}/index.ts";
import { UserIndexResource } from "./user/index.ts";
import { UserMeResource } from "./user/me.ts";
import { type NeolaceHttpResource } from "./mod.ts";

export const builtInRestApiResources: (typeof NeolaceHttpResource)[] = [
    HomePageResource,
    HealthCheckResource,
    RequestLoginResource,
    PasswordlessLoginWebhookResource,
    SystemKeyResource,
    SiteLookupResource,
    SiteHomeResource,
    SchemaIndexResource,
    DraftIndexResource,
    DraftResource,
    DraftFileResource,
    AcceptDraftResource,
    EntryListResource,
    EntryResource,
    UserIndexResource,
    UserMeResource,
];
