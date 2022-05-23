import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { isPlugin, NeolacePlugin } from "neolace/plugins/mod.ts";

let pluginsPromise: Promise<NeolacePlugin[]> | undefined = undefined;

export function getPlugins(): Promise<NeolacePlugin[]> {
    if (pluginsPromise) {
        return pluginsPromise;
    }
    pluginsPromise = (async () => {
        const pluginCache: NeolacePlugin[] = [];
        log.info("Initializing plugins...");
        for (const plugin of config.plugins) {
            // For built-in plugins (in this folder), just specifying the name of the plugin folder is sufficient.
            // Otherwise, the plugin "mod" string should be the full import path/URL of the plugin's mod.ts file.
            const path = plugin.mod.includes("/") ? plugin.mod : `neolace/plugins/${plugin.mod}/mod.ts`;
            const mod = await import(path);
            if (mod && isPlugin(mod.thisPlugin)) {
                pluginCache.push(mod.thisPlugin);
            } else {
                throw new Error(
                    `Plugin file ${plugin.mod} was loaded but appears not to contain a valid Neolace plugin.`,
                );
            }
        }
        log.info(`Initialized ${pluginCache.length} plugins (${pluginCache.map((p) => p.id).join(", ")})`);
        return pluginCache;
    })();
    return pluginsPromise;
}

export async function getPluginsForSite(siteId: VNID): Promise<NeolacePlugin[]> {
    return (await getPlugins()).filter((plugin) => plugin.isEnabledForSite(siteId));
}
