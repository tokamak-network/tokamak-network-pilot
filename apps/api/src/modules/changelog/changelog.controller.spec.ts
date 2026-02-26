import { ChangelogController } from './changelog.controller';

describe('ChangelogController', () => {
  const changelogService = {
    getAll: jest.fn(),
    getLatest: jest.fn(),
    getByVersion: jest.fn(),
  };

  let controller: ChangelogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ChangelogController(changelogService as any);
  });

  it('returns changelog entries with total', () => {
    changelogService.getAll.mockReturnValue([{ version: '0.1.0' }]);
    expect(controller.getChangelog('added')).toEqual({
      entries: [{ version: '0.1.0' }],
      total: 1,
    });
    expect(changelogService.getAll).toHaveBeenCalledWith('added');
  });

  it('returns latest entry', () => {
    changelogService.getLatest.mockReturnValue({ version: '0.4.0' });
    expect(controller.getLatest()).toEqual({ version: '0.4.0' });
  });

  it('returns version entry or friendly not-found message', () => {
    changelogService.getByVersion.mockReturnValueOnce({ version: '0.3.0' });
    expect(controller.getByVersion('0.3.0')).toEqual({ version: '0.3.0' });

    changelogService.getByVersion.mockReturnValueOnce(undefined);
    expect(controller.getByVersion('9.9.9')).toEqual({
      message: 'No changelog found for version 9.9.9',
    });
  });
});
