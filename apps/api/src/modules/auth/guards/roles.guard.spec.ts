import { ROLES_KEY, Roles, RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as any);
  });

  function contextWithRole(role?: string): any {
    return {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    };
  }

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWithRole('viewer'))).toBe(true);
  });

  it('allows matching role and denies non-matching role', () => {
    reflector.getAllAndOverride.mockReturnValue(['project_lead', 'admin']);

    expect(guard.canActivate(contextWithRole('project_lead'))).toBe(true);
    expect(guard.canActivate(contextWithRole('viewer'))).toBe(false);
  });

  it('Roles decorator stores role metadata', () => {
    class DummyController {
      @Roles('project_lead', 'member')
      run() {
        return true;
      }
    }

    expect(Reflect.getMetadata(ROLES_KEY, DummyController.prototype.run)).toEqual([
      'project_lead',
      'member',
    ]);
  });
});
