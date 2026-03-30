/**
 * Claude launch argument helpers for third-party WebSearch.
 */

const NATIVE_WEBSEARCH_TOOL = 'WebSearch';
const DISALLOWED_TOOLS_FLAG = '--disallowedTools';

function parseToolValue(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function hasToolInFlag(args: string[], flag: string, toolName: string): boolean {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === flag) {
      for (let cursor = index + 1; cursor < args.length; cursor += 1) {
        const value = args[cursor];
        if (value.startsWith('--')) {
          break;
        }
        if (parseToolValue(value).includes(toolName)) {
          return true;
        }
      }
      continue;
    }

    if (!arg.startsWith(`${flag}=`)) {
      continue;
    }

    const rawValue = arg.slice(flag.length + 1);
    if (parseToolValue(rawValue).includes(toolName)) {
      return true;
    }
  }

  return false;
}

export function appendThirdPartyWebSearchToolArgs(args: string[]): string[] {
  if (hasToolInFlag(args, DISALLOWED_TOOLS_FLAG, NATIVE_WEBSEARCH_TOOL)) {
    return args;
  }

  return [...args, DISALLOWED_TOOLS_FLAG, NATIVE_WEBSEARCH_TOOL];
}
