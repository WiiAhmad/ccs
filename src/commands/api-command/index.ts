import { dispatchNamedCommand, type NamedCommandRoute } from '../named-command-router';
import { handleApiCopyCommand } from './copy-command';
import { handleApiCreateCommand } from './create-command';
import { handleApiDiscoverCommand } from './discover-command';
import { handleApiExportCommand } from './export-command';
import { showApiCommandHelp, showUnknownApiCommand } from './help';
import { handleApiImportCommand } from './import-command';
import { handleApiListCommand } from './list-command';
import { handleApiRemoveCommand } from './remove-command';

export { parseApiCommandArgs } from './shared';

type ApiCommandHandler = (args: string[]) => Promise<void>;
type ApiCommandHelpHandler = () => Promise<void>;
type ApiCommandUnknownHandler = (command: string) => Promise<void>;

export interface ApiCommandDependencies {
  help: ApiCommandHelpHandler;
  unknown: ApiCommandUnknownHandler;
  create: ApiCommandHandler;
  list: ApiCommandHandler;
  discover: ApiCommandHandler;
  copy: ApiCommandHandler;
  export: ApiCommandHandler;
  import: ApiCommandHandler;
  remove: ApiCommandHandler;
}

const DEFAULT_API_COMMAND_DEPENDENCIES: ApiCommandDependencies = {
  help: showApiCommandHelp,
  unknown: showUnknownApiCommand,
  create: handleApiCreateCommand,
  list: handleApiListCommand,
  discover: handleApiDiscoverCommand,
  copy: handleApiCopyCommand,
  export: handleApiExportCommand,
  import: handleApiImportCommand,
  remove: handleApiRemoveCommand,
};

function createApiCommandRoutes(
  dependencies: ApiCommandDependencies
): readonly NamedCommandRoute[] {
  return [
    { name: 'create', handle: dependencies.create },
    { name: 'list', handle: dependencies.list },
    { name: 'discover', handle: dependencies.discover },
    { name: 'copy', handle: dependencies.copy },
    { name: 'export', handle: dependencies.export },
    { name: 'import', handle: dependencies.import },
    { name: 'remove', aliases: ['delete', 'rm'], handle: dependencies.remove },
  ];
}

export function createApiCommandHandler(
  overrides: Partial<ApiCommandDependencies> = {}
): (args: string[]) => Promise<void> {
  const dependencies: ApiCommandDependencies = {
    ...DEFAULT_API_COMMAND_DEPENDENCIES,
    ...overrides,
  };
  const routes = createApiCommandRoutes(dependencies);

  return async (args: string[]) => {
    await dispatchNamedCommand({
      args,
      routes,
      onHelp: dependencies.help,
      onUnknown: dependencies.unknown,
      allowEmptyHelp: true,
    });
  };
}

export async function handleApiCommand(args: string[]): Promise<void> {
  await createApiCommandHandler()(args);
}
