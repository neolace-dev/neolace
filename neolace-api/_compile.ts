import { ensureDir } from "https://deno.land/std@0.99.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.99.0/path/mod.ts";

const distDir = "dist/";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Clear out the "dist" folder
for await (const existingFile of Deno.readDir(distDir)) {
    await Deno.remove(`${distDir}${existingFile.name}`, {recursive: true});
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Emit TypeScript declaration files for Neolace API
const srcDir = "src";
const {files} = await Deno.emit(`${srcDir}/index.ts`, {
    compilerOptions: {
        declaration: true,
    },
});

for (const _path in files) {
    if (!_path.endsWith(".d.ts")) {
        continue;
    }
    // Write out any .d.ts files:
    const idx = _path.lastIndexOf(`/${srcDir}/`);
    if (idx === -1) {
        throw new Error("Internal error, path mismatch");
    }
    const pathPrefix = _path.substr(0, idx+srcDir.length+2);
    const pathSuffix = _path.substr(pathPrefix.length); // The part of the path after /src/
    const relativeRoot = Array(pathSuffix.split("/").length).join("../") || "./";  // e.g. if pathSuffix is "foo/bar.ts", this is "../"
    const newPath = distDir + pathSuffix;
    await ensureDir(dirname(newPath));  // Make sure any required subfolders exist

    // For some reason, Deno/TypeScript is including absolute import paths to some types in the .d.ts files. Fix that:
    let fileContents = files[_path];
    fileContents = fileContents.replaceAll(pathPrefix, relativeRoot);
    await Deno.writeTextFile(newPath, fileContents);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Now emit a single .JS bundle
const bundleResult = await Deno.emit(`${srcDir}/index.ts`, {
    bundle: "classic",
    check: false,  // Already checked, above.
});

const bundleFile = bundleResult.files["deno:///bundle.js"];
await Deno.writeTextFile(`${distDir}index.ts.js`, bundleFile);
