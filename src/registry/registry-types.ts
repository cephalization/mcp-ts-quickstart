/**
 * Registry Types for Auto-Loading MCP Modules
 * 
 * This pattern enables automatic discovery and registration of tools, resources,
 * and prompts by dropping files in their respective directories.
 * 
 * Inspired by:
 * - fastmcp (@punkpeye): https://github.com/punkpeye/fastmcp
 * - alexanderop/mcp-server-starter-ts: https://github.com/alexanderop/mcp-server-starter-ts
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Module types that can be auto-registered
 */
export type ModuleType = 'tool' | 'resource' | 'prompt';

/**
 * Base interface for all registerable modules
 * 
 * Any module that implements this interface can be auto-discovered
 * and registered with the MCP server.
 * 
 * @example
 * ```typescript
 * // src/tools/my-tool.ts
 * import type { RegisterableModule } from '../registry/types.ts';
 * 
 * const myTool: RegisterableModule = {
 *   type: 'tool',
 *   name: 'my-tool',
 *   description: 'Does something useful',
 *   register(server) {
 *     server.tool(this.name, this.description, schema, handler);
 *   }
 * };
 * 
 * export default myTool;
 * ```
 */
export interface RegisterableModule {
  /** The type of module (tool, resource, or prompt) */
  type: ModuleType;
  
  /** Unique identifier for the module */
  name: string;
  
  /** Human-readable description of what this module does */
  description: string;
  
  /**
   * Registration function called by the auto-loader
   * @param server - The MCP server instance to register with
   */
  register: (server: McpServer) => void;
  
  /**
   * Optional metadata for documentation or debugging
   */
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
  };
}

/**
 * Result of auto-loading operation
 */
export interface LoadResult {
  /** Modules that were successfully registered */
  loaded: {
    type: ModuleType;
    name: string;
    path: string;
  }[];
  
  /** Files that were skipped (with reasons) */
  skipped: {
    file: string;
    reason: string;
  }[];
  
  /** Errors encountered during loading */
  errors: {
    file: string;
    error: Error;
  }[];
}

/**
 * Configuration options for auto-loader
 */
export interface AutoLoaderOptions {
  /** Whether to show verbose logging */
  verbose?: boolean;
  
  /** Pattern to match files (default: all .ts files) */
  filePattern?: RegExp;
  
  /** Whether to throw on errors or continue */
  throwOnError?: boolean;
}