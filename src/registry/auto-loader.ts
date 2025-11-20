/**
 * Auto-Loader for MCP Modules
 * 
 * Automatically discovers and registers tools, resources, and prompts
 * from designated directories. Drop a properly formatted file in the
 * directory and it's instantly available in your MCP server.
 * 
 * Pattern inspired by fastmcp and alexanderop/mcp-server-starter-ts
 */

import { readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisterableModule, LoadResult, AutoLoaderOptions } from './registry-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Auto-load and register all modules from a directory
 * 
 * @param server - MCP server instance
 * @param relativePath - Path relative to registry directory (e.g., '../tools')
 * @param options - Configuration options
 * @returns Results of the loading operation
 * 
 * @example
 * ```typescript
 * // Load all tools
 * await autoLoadModules(server, '../tools');
 * 
 * // Load with verbose logging
 * await autoLoadModules(server, '../tools', { verbose: true });
 * ```
 */
export async function autoLoadModules(
  server: McpServer,
  relativePath: string,
  options: AutoLoaderOptions = {}
): Promise<LoadResult> {
  const {
    verbose = true,
    filePattern = /\.ts$/,
    throwOnError = false
  } = options;

  const result: LoadResult = {
    loaded: [],
    skipped: [],
    errors: []
  };

  const modulesDir = resolve(__dirname, relativePath);

  if (verbose) {
    console.error(`🔍 Auto-loading modules from: ${modulesDir}`);
  }

  try {
    const files = await readdir(modulesDir);
    const targetFiles = files.filter(f =>
      filePattern.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.includes('.test.') &&
      !f.includes('.spec.')
    );

    if (verbose) {
      console.error(`📁 Found ${targetFiles.length} potential modules`);
    }

    for (const file of targetFiles) {
      await loadModule(server, modulesDir, file, result, verbose);
    }

    // Print summary
    if (verbose) {
      printLoadSummary(result);
    }

    // Throw if requested and errors occurred
    if (throwOnError && result.errors.length > 0) {
      throw new Error(
        `Failed to load ${result.errors.length} module(s): ${
          result.errors.map(e => e.file).join(', ')
        }`
      );
    }

  } catch (error) {
    console.error(`❌ Error reading directory ${modulesDir}:`, error);
    if (throwOnError) throw error;
  }

  return result;
}

/**
 * Load a single module file
 */
async function loadModule(
  server: McpServer,
  modulesDir: string,
  file: string,
  result: LoadResult,
  verbose: boolean
): Promise<void> {
  const modulePath = join(modulesDir, file);
  
  try {
    const module = await import(modulePath);
    
    // Check for default export
    if (!module.default) {
      result.skipped.push({
        file,
        reason: 'No default export'
      });
      if (verbose) {
        console.error(`⏭️  Skipped ${file}: No default export`);
      }
      return;
    }

    const registerable = module.default as RegisterableModule;

    // Validate structure
    if (!isValidModule(registerable)) {
      result.skipped.push({
        file,
        reason: 'Invalid module structure (missing type, name, or register)'
      });
      if (verbose) {
        console.error(`⏭️  Skipped ${file}: Invalid structure`);
      }
      return;
    }

    // Register the module
    try {
      registerable.register(server);

      result.loaded.push({
        type: registerable.type,
        name: registerable.name,
        path: modulePath
      });

      if (verbose) {
        const emoji = getEmojiForType(registerable.type);
        console.error(`${emoji} Registered ${registerable.type}: ${registerable.name}`);
      }
    } catch (regError) {
      result.errors.push({
        file,
        error: regError as Error
      });
      console.error(`❌ Failed to register ${file}:`, regError);
    }

  } catch (error) {
    result.errors.push({
      file,
      error: error as Error
    });
    console.error(`❌ Error loading ${file}:`, error);
  }
}

/**
 * Validate that a module has the required structure
 */
function isValidModule(obj: any): obj is RegisterableModule {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.register === 'function'
  );
}

/**
 * Get emoji for module type
 */
function getEmojiForType(type: string): string {
  const emojis: Record<string, string> = {
    tool: '🔧',
    resource: '📦',
    prompt: '💬'
  };
  return emojis[type] || '✅';
}

/**
 * Print a summary of the loading operation
 * Note: Uses console.error to avoid interfering with stdio JSON-RPC protocol
 */
function printLoadSummary(result: LoadResult): void {
  console.error('\n📊 Auto-loading Summary:');
  console.error(`   ✅ Loaded: ${result.loaded.length}`);
  console.error(`   ⏭️  Skipped: ${result.skipped.length}`);
  console.error(`   ❌ Errors: ${result.errors.length}`);

  if (result.loaded.length > 0) {
    console.error('\n📋 Registered modules:');
    const byType = result.loaded.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(byType)) {
      const emoji = getEmojiForType(type);
      console.error(`   ${emoji} ${type}s: ${count}`);
    }
  }

  if (result.errors.length > 0) {
    console.error('\n⚠️  Errors encountered:');
    result.errors.forEach(({ file, error }) => {
      console.error(`   - ${file}: ${error.message}`);
    });
  }

  console.error(''); // Empty line for spacing
}