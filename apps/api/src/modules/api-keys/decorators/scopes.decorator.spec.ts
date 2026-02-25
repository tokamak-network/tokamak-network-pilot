import { SCOPES_KEY, Scopes } from './scopes.decorator';

describe('Scopes decorator', () => {
  it('stores required scopes metadata on handler', () => {
    class DummyController {
      @Scopes('ask', 'search')
      ask() {
        return true;
      }
    }

    const handler = DummyController.prototype.ask;
    const metadata = Reflect.getMetadata(SCOPES_KEY, handler);

    expect(metadata).toEqual(['ask', 'search']);
  });
});
