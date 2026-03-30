import { describe, expect, it } from 'bun:test';
import { appendThirdPartyWebSearchToolArgs } from '../../../../src/utils/websearch/claude-tool-args';

describe('appendThirdPartyWebSearchToolArgs', () => {
  it('appends native WebSearch suppression when no tool flags are present', () => {
    expect(appendThirdPartyWebSearchToolArgs(['smoke'])).toEqual([
      'smoke',
      '--disallowedTools',
      'WebSearch',
    ]);
  });

  it('does not append duplicate suppression when WebSearch is already disallowed', () => {
    expect(appendThirdPartyWebSearchToolArgs(['smoke', '--disallowedTools', 'WebSearch'])).toEqual(
      ['smoke', '--disallowedTools', 'WebSearch']
    );
  });

  it('detects comma-separated disallowed tool values', () => {
    expect(appendThirdPartyWebSearchToolArgs(['smoke', '--disallowedTools=Read,WebSearch'])).toEqual(
      ['smoke', '--disallowedTools=Read,WebSearch']
    );
  });
});
